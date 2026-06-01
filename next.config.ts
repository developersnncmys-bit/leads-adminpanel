import type { NextConfig } from "next";

// Static export is applied only for production builds. In `next dev` we keep
// dynamic routing so arbitrary lead/blog IDs (which come from the API at
// runtime) work without being pre-enumerated by `generateStaticParams`.
// `next build` sets NODE_ENV=production and produces the `out/` folder used
// by Netlify; the Netlify rewrites in netlify.toml serve a prerendered shell
// for any non-enumerated ID, and `useParams()` reads the real id from the URL.
const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  // CKEditor 5 ships CommonJS that Turbopack chokes on unless we explicitly
  // transpile it through the Next.js pipeline.
  transpilePackages: ["@ckeditor/ckeditor5-react", "@ckeditor/ckeditor5-build-classic"],
};

export default nextConfig;
