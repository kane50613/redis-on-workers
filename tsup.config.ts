import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  splitting: false,
  external: ["cloudflare:sockets", "@arrowood.dev/socket"],
  dts: true,
  clean: true,
  target: "esnext",
  format: ["cjs", "esm"],
  minify: true,
});
