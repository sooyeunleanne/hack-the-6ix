/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // @auth0/nextjs-auth0's dpopUtils.js builds the string "crypto" at
    // runtime (`"cry" + "pto"`) specifically so bundlers can't see it and
    // pull Node's crypto module into Edge bundles. Webpack still flags the
    // resulting `import(cryptoModule)` as a "critical dependency" it can't
    // statically resolve and tries to eagerly build a context module for
    // every possible match, which is what was making compiles (including
    // middleware, which runs on nearly every route) pathologically slow.
    // The guarded code path (isEdgeRuntime()) already prevents it from ever
    // actually executing in Edge at runtime, so it's safe to tell webpack
    // not to eagerly resolve it.
    config.module.exprContextCritical = false;
    return config;
  }
};

module.exports = nextConfig;
