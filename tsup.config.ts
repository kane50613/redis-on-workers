import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  splitting: false,
  external: ["cloudflare:sockets"],
  dts: true,
  clean: true,
  target: "esnext",
  cjsInterop: true,
  format: ["cjs", "esm"],
  minify: true,
});
