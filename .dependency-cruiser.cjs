/**
 * THE DEPENDENCY RULE, MACHINE-ENFORCED.
 * `npm run deps` fails the build on any violation. Agents cannot
 * "forget" the architecture: it is physically impossible to merge
 * code that breaks these boundaries.
 */
module.exports = {
  forbidden: [
    {
      name: "domain-must-stay-pure",
      comment:
        "src/domain may import nothing outside src/domain — no application, no infrastructure, no node_modules, no node builtins.",
      severity: "error",
      from: { path: "^src/domain" },
      to: { pathNot: "^src/domain" },
    },
    {
      name: "application-depends-only-on-domain",
      comment: "src/application may import only src/domain and itself.",
      severity: "error",
      from: { path: "^src/application" },
      to: { pathNot: "^(src/application|src/domain)" },
    },
    {
      name: "infrastructure-never-imports-main",
      comment: "adapters must not reach into the composition root.",
      severity: "error",
      from: { path: "^src/infrastructure" },
      to: { path: "^src/main" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
