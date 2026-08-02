import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'android/**/*', 'ios/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
