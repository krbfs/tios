import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/privacy",
        destination: "/privacy.html",
        permanent: true,
      },
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
