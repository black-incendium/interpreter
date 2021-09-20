function parser(tokens) {
    let current = 0;
    if (tokens.length == 1) return undefined;

    function newBinaryExpr({expression, operator, right, line}) {
        return {expression, operator, right, type:'binary', line};
    }

    function newUnaryExpr({operator, right, line}) {
        return {operator, right, type:'unary', line};
    }

    function newLiteralExpr({value, line}) {
        return {value, type: 'literal', line};
    }
    
    function newGroupingEpxr({expression, line}) {
        return {expression, type: 'grouping', line};
    }

    function newVariableExpr({name, line}) {
        return {name, type: 'variable', line};
    }

    function newAssignmentExpr({name, value, line}) {
        return {name, value, type:'assignment', line};
    }

    function newLogicOrExpr({left, operator, right, line}) {
        return {left, operator, right, type:'logicOr', line};
    }

    function newLogicAndExpr({left, operator, right, line}) {
        return {left, operator, right, type:'logicAnd', line};
    }

    function newCallExpr({callee, paren, args, line}) {
        return {callee, paren, args, type: 'call', line};
    }

    function newFunctionExpr({parameters, body, line}) {
        let obj = {
            parameters,
            body, 
            type:'function', 
            line,
            declaredHere: true,
            callFunction: function({args, environment, executeBlock}){
                for (let i=0; i<obj.parameters.length; i++) {
                    environment.define({name: obj.parameters[i].value, value: args[i], line});
                }
                return executeBlock(obj.body.statements, environment, true);
            }
        };
        return obj;
    }

    function consume(tokenType, message) {
        if (check(tokenType)) return advance();

        error(peek(), message);
    }

    function isAtEnd() {return peek().type == 'EOF'}
    function peek() {return tokens[current]}
    function previous() {return tokens[current-1]}
    function advance() {if (!isAtEnd()) current++; return previous();}
    function check(tokenType) {return peek().type == tokenType} //inaczej niz w kodzie, nie dalem if isAtEnd return false, mozna zrobic check('EOF')
    function match(...tokenTypes) {
        for (let i=0; i<tokenTypes.length; i++) {
            if (check(tokenTypes[i])) {
                advance();
                return true;
            }
        }
        return false;
    }

    function expression() {
        return assignment();
    }

    function assignment() {
        let expr = logicOr();

        if (match('assignment')) {
            let operatorToken = previous();
            let value = assignment();

            if (expr.type == 'variable') {
                return newAssignmentExpr({name: expr.name, value, line: operatorToken.line})
            }
            error(operatorToken, 'invalid assignment target');
        }
        return expr
    }

    function logicOr() {
        let expr = logicAnd();

        while (match('or')) {
            expr = newLogicOrExpr({left: expr, operator: previous(), right:logicOr(), line: previous().line})
        }
        return expr;
    }

    function logicAnd() {
        let expr = equality();

        while (match('and')) {
            expr = newLogicAndExpr({left: expr, operator: previous(), right:logicAnd(), line: previous().line})
        }
        return expr;
    }

    function equality() {
        let expr = comparison();

        while (match('equal', 'notEqual')) {
            expr = newBinaryExpr({expression: expr, operator: previous(), right: comparison(), line: previous().line})
        }
        return expr;
    }

    function comparison() {
        let expr = term();

        while(match('less', 'lessEqual', 'greater', 'greaterEqual')) {
            expr = newBinaryExpr({expression: expr, operator: previous(), right: term(), line: previous().line})
        }
        return expr;
    }

    function term() {
        let expr = factor();

        while(match('plus', 'minus')) {
            expr = newBinaryExpr({expression: expr, operator: previous(), right: factor(), line: previous().line})
        }
        return expr;
    }

    function factor() {
        let expr = unary();

        while(match('slash', 'star')) {
            expr = newBinaryExpr({expression: expr, operator: previous(), right: unary(), line: previous().line})
        }
        return expr;
    }

    function unary() {
        if (match('not', 'minus')) {
            return newUnaryExpr({operator: previous(), right: unary(), line: previous().line})
        }
        return call();
    }

    function call() {
        let expr = primary();

        while (true) {
            if (match('leftParen')) {
                expr = finishCall(expr);
            } else {
                break;
            }
        }
        return expr;
    }

    function primary() {
        let parameters;
        let body;
        if (match('false')) return newLiteralExpr({value: false, line: previous().line});
        else if (match('true')) return newLiteralExpr({value: true, line: previous().line});
        else if (match('undefined')) return newLiteralExpr({value: undefined, line: previous().line});
        else if (match('number', 'string')) return newLiteralExpr({value: previous().value, line: previous().line});
        else if (match('leftParen')) {
            let expr = expression();
            consume('rightParen', "expected ')' after expression");
            return newGroupingEpxr({expression: expr, line: previous().line});
        }
        else if (match('function')) {
            parameters = [];
            consume('leftParen', "expected '(' before parameters");
            if (!check('rightParen')) {
                do {
                    parameters.push(consume('identifier', 'expected parameter name'))
                } while (match('coma'));
            }
            consume('rightParen', "expected ')' after arguments")
            consume('leftBracket', "expected '{' before function body")
            body = block();
            return newFunctionExpr({parameters, body, line: previous().line});
        }
        else if (match('identifier')) return newVariableExpr({name: previous().value, line: previous().line})
        error(peek(), 'expected expression');
    }

    function finishCall(callee) {
        let args = [];
        if (!check('rightParen')) {
            do {
                args.push(expression())
            } while (match('coma'));
        }
        let paren = consume('rightParen', "expected ')' after arguments");
        return newCallExpr({callee, paren, args, line: previous().line})
    }

    function parse() {
        let statements = [];

        while (!isAtEnd()) {
            statements.push(declaration())
        }
        return statements;
    }

    function declaration() {
        if (match('let')) return letDeclaration();
        return statement();
    }

    function statement() {
        if (match('if')) return ifStatement();
        if (match('while')) return whileStatement();
        if (match('leftBracket')) return blockStatement(block());
        if (match('return')) return returnStatement();
        return expressionStatement();
    }

    function block() {
        let statements = [];
        let hoistedVariables = [];
        let last;
        while (!check('rightBracket') && !isAtEnd()) {
            last = declaration();
            statements.push(last);
            if (last.type == 'let') hoistedVariables.push(last.name.value); 
        }
        consume('rightBracket', "expected '}' at the end of block");
        return {statements, initializedVariables: hoistedVariables};
    }

    function letDeclaration() {
        let name = consume('identifier', 'expected variable name');
        let initializer = undefined;
        if (match('assignment')) initializer = expression();
        consume('semicolon', "expected ';' after variable declaration");
        return newStmt({type:'let', name, value: initializer})
    }
    
    function expressionStatement() {
        let expr = expression();
        consume('semicolon', "expected ';' after value")
        return newStmt({type: 'expression', value: expr})
    }

    function blockStatement({statements, initializedVariables}) {
        return {type: 'block', statements, initializedVariables}
    }
    
    function ifStatement() {
        consume('leftParen', "expected '(' after if");
        let condition = expression();
        consume('rightParen', "expected ')' after expression in condition");
        let branchThen = statement();
        let branchElse;
        if (match('else')) branchElse = statement();
        return newStmt({type: 'if', condition , branchThen, branchElse})  
    }
    
    function whileStatement() {
        consume('leftParen', "expected '(' after if");
        let condition = expression();
        consume('rightParen', "expected ')' after expression in condition");
        let body = statement();
        return newStmt({type: 'while', condition, body})
    }

    function returnStatement() {
        let value;
        if (!check('semicolon')) value = expression();
        consume('semicolon', "expected ';' after return value")
        return newStmt({type: 'return', value, line: previous().line});
    }
    
    function newStmt({type, value, name, condition, branchThen, branchElse, body, line}) {
        return {type, value, name, condition, branchThen, branchElse, body, line};
    }
    
    return parse();
}