import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const generatedSrc = resolve(root, "src/generated");
const repoRoot = resolve(root, "..", "..");
const outputFile = resolve(generatedSrc, "contracts.ts");

mkdirSync(generatedSrc, { recursive: true });
// 统一从 Rust DTO AST 导出单一 contracts.ts，避免手写 TS 契约漂移。
execSync(
  // Windows 路径里反斜杠需要转义后再传入 cargo 命令行参数。
  `cargo run -p shared-rs --bin export_contracts -- "${outputFile.replace(/\\/g, "\\\\")}"`,
  {
    cwd: repoRoot,
    stdio: "inherit",
  },
);
console.log("shared-ts contracts generated from Rust AST");
