function interpreter(ast) {
    let globalEnv = newEnvironment();
    let environment = globalEnv;

    globalEnv.define({name: 'print', value: {
        callFunction: function({args}) {
            let output = document.querySelector('.output');
            for (let i=0; i<args.length; i++) {
                output.value+=args[i]+" ";
            }
            output.value+='\n';
        },
        type: 'function',
        predefined: true
    }});
    
    function newEnvironment(enclosing, initializedVariables = [], iif) {
        let environment = { 
            initializedVariables,
            enclosing,
            values: {},
            isInFunction: iif ?? enclosing?.iif ?? false,
            define: function({name, value, line, predefined = false}) {
                if (environment.values.hasOwnProperty(name)) throw `at line: ${line}, variable ${name} is already defined`;
                if (!predefined) environment.initializedVariables.splice(environment.initializedVariables.indexOf(name), 1);
                Object.defineProperty(environment.values, name, {value:value, configurable: true, writable: true})
            },
            get: function({name, line}) {
                if (environment.initializedVariables.includes(name)) throw `at line: ${line}, variable ${name} is in temporal dead zone, cannot be accessed before declaration`;
                if (environment.values.hasOwnProperty(name)) return environment.values[name];
                else if (environment.enclosing != undefined) return environment.enclosing.get({name, line})
                throw `at line: ${line}, variable ${name} is not defined`
            },
            assign: function({name, value, line}) {
                if (environment.values.hasOwnProperty(name)) {
                    environment.values[name] = value;
                    return;
                }
                else if (environment.enclosing != undefined) return environment.enclosing.assign({name, value, line})
                throw `at line: ${line}, variable ${name} is not defined`
            }
        }
        return environment;
    }

    function isTruthy(x) {
        if (x === false || x === 0 || x === undefined) return false;
        return true;
    }

    function isEqual(left, right) {
        if (typeof left != typeof right) return false;
        return right == left;
    }

    function evaluate(expression){
        if (expression == undefined) return undefined;
        let a = {}; // auxiliary object
        switch(expression.type) {
            case 'literal': return expression.value; break;
            case 'grouping': return evaluate(expression.expression); break;
            case 'unary':
                switch (expression.operator.type) {
                    case 'minus': 
                        if (typeof expression.right.value == 'number') return -expression.right.value;
                        error(expression.operator, 'wrong type operand'); 
                    break;
                    case 'not': return !isTruthy(expression.right.value); break;
                }
            break;
            case 'binary':
                a.left = evaluate(expression.expression);
                a.right = evaluate(expression.right);
                switch (expression.operator.type) {
                    case 'plus': 
                        if (typeof a.left == 'number' && typeof a.right == 'number') return a.left + a.right;
                        if (typeof a.left == 'string' && typeof a.right == 'string') return a.left + a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'minus':
                        if (typeof a.left == 'number' && typeof a.right == 'number') return a.left - a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'slash': 
                        if (typeof a.left == 'number' && typeof a.right == 'number' && a.right !== 0) return a.left/a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'star':
                        if (typeof a.left == 'number' && typeof a.right == 'number') return a.left*a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'greater':
                        if (typeof a.left == 'number' && typeof a.right == 'number') return a.left>a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'greaterEqual':
                        if (typeof a.left == 'number' && typeof a.right == 'number') return a.left>=a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'less':
                        if (typeof a.left == 'number' && typeof a.right == 'number') return a.left<a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'lessEqual':
                        if (typeof a.left == 'number' && typeof a.right == 'number') return a.left<=a.right;
                        error(expression.operator, 'wrong type operands');
                    break;
                    case 'equal':
                        return isEqual(a.left, a.right);
                    break;
                    case 'notEqual':
                        return !isEqual(a.left, a.right);
                    break;
                }
            break;
            case 'logicOr':
                a.left = evaluate(expression.left);
                if (isTruthy(a.left)) return a.left;
                return evaluate(expression.right);
            break;
            case 'logicAnd':
                a.left = evaluate(expression.left)
                if (!isTruthy(a.left)) return a.left;
                return evaluate(expression.right);
            break;
            break;
            case 'variable':
                return environment.get({name: expression.name, line: expression.line})
            break;
            case 'assignment':
                a.value = evaluate(expression.value)
                environment.assign({name: expression.name, value:a.value, line: expression.line});
                return a.value;
            break;
            case 'call':
                a.callee = evaluate(expression.callee);
                a.arguments = [];
                for (let i=0; i<expression.args.length; i++) {
                    a.arguments.push(evaluate(expression.args[i]));
                }
                if (a.callee.type != 'function') error(expression.paren, 'tried calling non-function');
                return a.callee.callFunction({args: a.arguments, environment: newEnvironment(a.callee.closure, a.callee.initializedVariables, true), executeBlock});
            break;
            case 'function':
                if (expression.declaredHere) {
                    expression.declaredHere = false;
                    expression.closure = environment;
                }
                return expression;
            break;
        }
    }

    function execute(statement) {
        let aux = null;
        switch (statement.type) {
            case 'let':
                environment.define({name: statement.name.value, value: evaluate(statement.value), line: statement.name.line});
            break;
            case 'block':
                return executeBlock(statement.statements, newEnvironment(environment, statement.initializedVariables), false)
            break;
            case 'if':
                if (isTruthy(evaluate(statement.condition))) return execute(statement.branchThen)
                else if (statement.branchElse != undefined) return execute(statement.branchElse);
            break;
            case 'while':
                while (isTruthy(evaluate(statement.condition))) {
                    aux = execute(statement.body)
                    if (aux !== null) return aux;
                }
                return aux;
            break;
            case 'return':
                if (!environment.isInFunction) throw `at line: ${statement.line}, return cannot be used outside function`;
                return evaluate(statement.value);
            break;
            case 'expression': evaluate(statement.value); break;
        }
        return null;
    }

    function executeBlock(statements, newEnvironment, isFunctionBody) {
        let aux = null;
        let previous = environment;
        environment = newEnvironment;

        for (let i=0; i<statements.length; i++) {
            aux = execute(statements[i]);
            if (aux !== null ) {
                environment = previous;
                return aux;
            }
        }
        environment = previous;
        if (isFunctionBody) {
            return undefined;
        }
        return null;
    } 

    function handleStatements(statements) {
        if (statements == undefined) return undefined;
        for (let i=0; i<statements.length; i++) {
            execute(statements[i]);
        }
    }

    handleStatements(ast);
}