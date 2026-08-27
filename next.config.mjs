const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "design-eng-prototypes";
const basePath = isGitHubPages ? `/${repositoryName}` : "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.0.117"],
  devIndicators: false,
};

export default nextConfig;
