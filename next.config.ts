import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes: true — disabled on next 15.5+ upgrade path:
  // dynamic string hrefs across app/subjects/*/page.tsx + practice-runner.tsx
  // no longer match RouteImpl and would need a wider Link href refactor.
  // Re-enable together with that refactor when there is time.
  typedRoutes: false,
};

export default nextConfig;
