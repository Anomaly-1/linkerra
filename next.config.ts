import { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // if you're using next/image
};
module.exports = nextConfig;
