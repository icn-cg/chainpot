import type { NextConfig } from "next";

type WebpackConfig = {
  resolve?: { alias?: Record<string, string | false> };
};

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://going.page https://sites.google.com;",
          },
        ],
      },
    ];
  },

  webpack(config: WebpackConfig) {
    config.resolve ||= {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
      "readable-stream": false,
    };
    return config as any;
  },
};

export default nextConfig;
