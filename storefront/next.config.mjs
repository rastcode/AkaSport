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

function originFromUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function websocketOrigin(origin) {
  if (!origin) return null;
  return origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildContentSecurityPolicy() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const siteOrigin = originFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const apiOrigin = originFromUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ||
      (isDevelopment ? "http://127.0.0.1:8000/api" : ""),
  );
  const mediaOrigin = originFromUrl(
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
      (isDevelopment ? "http://127.0.0.1:8000" : ""),
  );
  const legacyMediaOrigins = (process.env.NEXT_PUBLIC_MEDIA_HOSTS || "")
    .split(",")
    .map((host) => originFromUrl(`https://${host.trim()}`))
    .filter(Boolean);

  const imageSources = unique([
    "'self'",
    "data:",
    "blob:",
    apiOrigin,
    mediaOrigin,
    ...legacyMediaOrigins,
    ...(isDevelopment
      ? ["http://localhost:8000", "http://127.0.0.1:8000"]
      : []),
  ]);
  const connectSources = unique([
    "'self'",
    apiOrigin,
    websocketOrigin(apiOrigin),
    ...(isDevelopment
      ? [
          "http://localhost:8000",
          "http://127.0.0.1:8000",
          "ws://localhost:3000",
          "ws://127.0.0.1:3000",
          "ws://localhost:8000",
          "ws://127.0.0.1:8000",
        ]
      : []),
  ]);
  const mediaSources = unique([
    "'self'",
    apiOrigin,
    mediaOrigin,
    ...legacyMediaOrigins,
  ]);

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    `media-src ${mediaSources.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (
    !isDevelopment &&
    siteOrigin &&
    siteOrigin.startsWith("https://")
  ) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
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
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: buildContentSecurityPolicy(),
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    const siteOrigin = originFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
    if (
      process.env.NODE_ENV === "production" &&
      siteOrigin?.startsWith("https://")
    ) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000",
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
