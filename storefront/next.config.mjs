function patternFromUrl(value, pathnameOverride) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const basePath = url.pathname.replace(/\/+$/, "");
    return {
      protocol: url.protocol.slice(0, -1),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: pathnameOverride || `${basePath || ""}/**`,
    };
  } catch {
    return null;
  }
}

function buildRemotePatterns() {
  const patterns = [
    { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/media/**" },
    { protocol: "http", hostname: "localhost", port: "8000", pathname: "/media/**" },
  ];

  const mediaPattern = patternFromUrl(process.env.NEXT_PUBLIC_MEDIA_BASE_URL);
  if (mediaPattern) patterns.push(mediaPattern);

  const apiPattern = patternFromUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "/media/**",
  );
  if (apiPattern) patterns.push(apiPattern);

  const legacyHosts = (process.env.NEXT_PUBLIC_MEDIA_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  for (const hostname of legacyHosts) {
    patterns.push({ protocol: "https", hostname, pathname: "/media/**" });
  }

  return patterns.filter(
    (pattern, index, all) =>
      index ===
      all.findIndex(
        (candidate) =>
          candidate.protocol === pattern.protocol &&
          candidate.hostname === pattern.hostname &&
          (candidate.port || "") === (pattern.port || "") &&
          candidate.pathname === pattern.pathname,
      ),
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
