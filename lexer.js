function lexer(input) {
    let tokens = [];
    let current = 0;
    let start = 0
    let line = 1;
    
    function isDigit(c) {return /[0-9]/.test(c)};
    function advance() {return input[current++]};
    function addToken(type, value, line) {tokens.push({type, value, line});}
    function isAtEnd(){return current >= input.length}

    function isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == "_";
    }

    function isAlphaNumeric(c) {
        return isAlpha(c) || isDigit(c);
    }

    function peek() {
        if (isAtEnd()) return '\0';
        return input[current];
    }

    function nextPeak() {
        if(current + 1 >= input.length) return '\0';
        return input[current + 1];
    }

    function match(expected) {
        if (isAtEnd()) return false;
        if (input[current] != expected) return false;
        current++;
        return true;
    }

    function stringToken(startChar) {
        while (peek() != startChar && peek() != '\n' && !isAtEnd()) advance();
        if (isAtEnd() || peek() == '\n') throw `unterminated string at line ${line}`;
        advance();
        addToken('string', input.substring(start+1, current-1), line);
    }

    function numberToken() {
        while (isDigit(peek())) advance();
        if (peek() == '.' && isDigit(nextPeak())) {
            advance();
            while (isDigit(peek())) advance();
        }
        addToken('number', parseFloat(input.substring(start, current)), line);
    }

    function identifierToken() {
        while (isAlphaNumeric(peek())) advance();
        if (['and','else','false','function','if','let','or','return','true','undefined','while'].includes(input.substring(start, current))) {
            addToken(input.substring(start, current), undefined, line);
        }
        else addToken('identifier', input.substring(start, current), line);
    }

    function scanToken() {
        let c = advance();
        switch (c) {
            case '(': addToken('leftParen', undefined, line); break;
            case ')': addToken('rightParen', undefined, line); break;
            case '{': addToken('leftBracket', undefined, line); break;
            case '}': addToken('rightBracket', undefined, line); break;
            case ',': addToken('coma', undefined, line); break;
            case '.': addToken('dot', undefined, line); break;
            case '+': addToken('plus', undefined, line); break;
            case '-': addToken('minus', undefined, line); break;
            case ';': addToken('semicolon', undefined, line); break;
            case '*': addToken('star', undefined, line); break;
            case '/': addToken('slash', undefined, line); break;
            case '!': addToken(match('=') ? 'notEqual' : 'not', undefined, line); break;
            case '=': addToken(match('=') ? 'equal' : 'assignment', undefined, line); break;
            case '<': addToken(match('=') ? 'lessEqual' : 'less', undefined, line); break;
            case '>': addToken(match('=') ? 'greaterEqual' : 'greater', undefined, line); break;
            case '\n': line++; break;
            case ' ': 
            case '\r': 
            case '\t': break;
            case '"': stringToken('"'); break; 
            case "'": stringToken("'"); break; 
            default:
                if (isDigit(c)) numberToken(); 
                else if (isAlpha(c)) identifierToken();
                else throw `unexpected character: '${c}' at line: ${line}`; 
            break;
        }
    }

    while (!isAtEnd()) {
        start = current;
        scanToken();
    }

    addToken('EOF', undefined, line);

    return tokens;
}