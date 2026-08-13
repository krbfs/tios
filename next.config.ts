import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/test",
        destination: "/test/start.html",
        permanent: false,
      },
      {
        source: "/test/take",
        destination: "/test/take.html",
        permanent: false,
      },
      {
        source: "/login",
        destination: "/login.html",
        permanent: false,
      },
      {
        source: "/cabinet",
        destination: "/cabinet.html",
        permanent: false,
      },
      {
        source: "/admin",
        destination: "/admin/index.html",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/quiz/result",
        destination: "/results.html",
      },
    ];
  },
};

export default nextConfig;
