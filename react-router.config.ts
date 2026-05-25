import { type Config } from "@react-router/dev/config";

export default {
  ssr: false,
  appDirectory: "app",
  buildDirectory: "build",
  assetsBuildDirectory: "build/client",
  publicPath: "/",
  entryClientFile: "entry.client.tsx",
  entryServerFile: "entry.server.tsx",
  dev: {
    command: "vite",
    flags: "--clearScreen false",
    port: 5173,
  },
  build: {
    command: "vite build",
    outDir: "build",
  },
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
} satisfies Config;