import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript 7 has no JS compiler API, so tools that `require('typescript')`
    // — typescript-eslint among them — need the 6.0 API. This project follows
    // the sanctioned side-by-side layout: the `typescript` package name is
    // aliased to `@typescript/typescript6` for those tools, and TS 7 is
    // installed as `@typescript/native` to provide the `tsc` that
    // `pnpm typecheck` runs. That leaves `typescript/bin/tsc` (TS 6 ships it as
    // `tsc6`) missing, so point Next's build-time check at the API instead of
    // the CLI it now prefers.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
