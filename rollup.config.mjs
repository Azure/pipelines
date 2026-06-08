import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const config = {
  input: "src/main.ts",
  output: {
    file: "dist/index.js",
    format: "cjs",
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      compilerOptions: { module: "esnext", outDir: "./dist", declaration: false, declarationMap: false },
    }),
    commonjs(),
    nodeResolve({ preferBuiltins: true }),
  ],
};

export default config;
