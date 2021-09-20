let input = "";

document.querySelector('textarea').addEventListener('input', function(){
    input = document.querySelector("textarea").value;
});

window.addEventListener('load', function(){
    input = `print('Interpreter of new language implemented in pure javascript. You can edit this code. To run it click anywhere on output part of the screen (with green font).');print('');print('it supports:');print('');print('* first-class lambda (anonymous) functions');print('* closures');print('* local variables and assignments using = operator');print('* built-in functions (print)');print('* statements: if, else, while, return');print('* block statements');print('* binary operators: +, -, /, *, and, or');print('* parentheses (grouping)');print('* comparison operators: ==, !=, <=, >=, <, >');print('* unary operators: !, -');print('* literals: numbers, strings, true, false, undefined andfunction literals');print('');print('Text above is generated using print function, I just removed enters to save space.');print('');\n\nprint('below are presented few features like closures, loops and control flow statements');\nprint('');\n\nlet makeCounter = function(){\n    let i = 0;\n    return function(){\n        i = i + 1;\n        print('inside counter function:',i);    \n    };\n};\n\nlet counter = makeCounter();\nlet i = 0;\n\nwhile (i<10) {\n    if (i>7) print('while loop incrementer is greater than seven');\n    else counter();\n    i = i + 1; \n}`;
    document.querySelector("textarea").value = input;
    run();
});

document.querySelector(".output").addEventListener('click', run);

function error(token, message) {
    throw `error at line: ${token.line} in token ${token.type}, ${message}`;
}

function run() {
    document.querySelector(".output").value = "";
    try {
    interpreter(parser(lexer(input)));
    } catch (error) {
        document.querySelector('.output').value += error;
    }
}