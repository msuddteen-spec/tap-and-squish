import { build } from "vite";

await build({
  appType: "spa",
  configFile: false,
  root: process.cwd(),
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
