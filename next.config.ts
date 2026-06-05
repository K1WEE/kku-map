import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled because react-leaflet's MapContainer doesn't tolerate
  // Strict-Mode double-mount (Leaflet binds to a DOM node imperatively).
  reactStrictMode: false,
};

export default nextConfig;
