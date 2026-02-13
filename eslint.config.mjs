import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [
      "eslint.config.mjs",
      "**/.next/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.netlify/**",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // These rules are too noisy for this small app and flag common, safe patterns.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];
