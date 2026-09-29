/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // requerido por Dockerfile multi-stage (imagen runtime mínima)
  // Habilita instrumentation.ts (Next 14.x todavía lo gatea detrás de este
  // flag — estable recién en Next 15). Ver docs/SETUP.md Paso 8.
  // `serverComponentsExternalPackages` evita que webpack intente bundlear
  // el SDK de Node de OpenTelemetry (y su dependencia @grpc/grpc-js, que
  // usa módulos nativos de Node como `net`/`zlib` incompatibles con el
  // bundler) — se cargan como `require()` normal en tiempo de ejecución.
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@opentelemetry/exporter-trace-otlp-http'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
