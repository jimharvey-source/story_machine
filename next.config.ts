import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its font metrics from disk at runtime; keep it outside the bundle and ship the files.
  serverExternalPackages: ["pdfkit", "pdf-parse", "mammoth"],
  outputFileTracingIncludes: {
    "/api/export": ["./node_modules/pdfkit/js/data/**"],
  },
};

export default nextConfig;
