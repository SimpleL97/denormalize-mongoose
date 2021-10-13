module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    'no-underscore-dangle': ['error', {
      allow: ['_id'],
      allowAfterThis: false,
      allowAfterSuper: false,
      enforceInMethodNames: true,
    }],
    'no-param-reassign': ['off'],
    'import/no-unresolved': ['off'],
    'new-cap': ['error', {
      "newIsCap": false,
      "capIsNew": false,
    }],
  },
};
