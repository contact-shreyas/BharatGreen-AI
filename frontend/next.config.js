/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.5"],
  output: "standalone",
};

module.exports = nextConfig;
