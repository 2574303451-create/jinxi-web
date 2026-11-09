import tseslint from 'typescript-eslint';
// Deliberately a focused correctness/security baseline, not a claim of full
// Next/a11y lint coverage. No existing check is disabled to hide a failure.
const rules={
 'constructor-super':'error','for-direction':'error','getter-return':'error',
 'no-async-promise-executor':'error','no-class-assign':'error','no-compare-neg-zero':'error',
 'no-cond-assign':['error','except-parens'],'no-const-assign':'error','no-debugger':'error',
 'no-dupe-args':'error','no-dupe-class-members':'error','no-dupe-else-if':'error','no-dupe-keys':'error',
 'no-eval':'error','no-implied-eval':'error','no-ex-assign':'error','no-loss-of-precision':'error',
 'no-obj-calls':'error','no-promise-executor-return':'error','no-self-assign':'error',
 'no-setter-return':'error','no-sparse-arrays':'error','no-unexpected-multiline':'error',
 'no-unreachable':'error','no-unsafe-finally':'error','no-unsafe-negation':'error',
 'use-isnan':'error','valid-typeof':'error',
};
export default[
 {ignores:['node_modules/**','out/**','.next/**','integration-local/site/.next/**','integration-local/site/next-env.d.ts','artifacts/**','scripts/output/**','next-env.d.ts']},
 {files:['app/**/*.{ts,tsx}','components/**/*.{ts,tsx}','hooks/**/*.{ts,tsx}','lib/**/*.{js,ts,tsx}','services/**/*.{ts,tsx}','types/**/*.ts','netlify/functions/**/*.js','tests/**/*.cjs','scripts/**/*.{js,cjs,mjs}','member-local/**/*.{js,cjs}','community-local/**/*.{js,cjs}','attendance-local/**/*.{js,cjs}','points-local/**/*.{js,cjs}','operations-local/**/*.{js,cjs}','integration-local/**/*.{js,cjs,mjs,ts,tsx}'],languageOptions:{parser:tseslint.parser,ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}},rules},
];
