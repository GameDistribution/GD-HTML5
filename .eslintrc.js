// http://eslint.org/docs/user-guide/configuring

module.exports = {
    root: true,
    parser: 'babel-eslint',
    parserOptions: {
        sourceType: 'module',
    },
    env: {
        es6: true,
        node: true,
        browser: true,
    },
    extends: ['google'],
    // add your custom rules here
    'rules': {
        // enable console logs
        'no-console': 0,
        // change indentation to 4 spaces instead of 2
        'indent': [2, 4],
        // allow paren-less arrow functions
        'arrow-parens': 0,
        // allow async-await
        'generator-star-spacing': 0,
    },
};
