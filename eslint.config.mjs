import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      ".local-speech/**",
      ".package-scaffold/**",
      "local-models/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts"
    ]
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;
