/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // TODO: [multi-league] Add rewrites to support /league/[leagueId] paths
};

export default nextConfig;
