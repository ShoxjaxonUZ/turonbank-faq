import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const viteCli = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const viteArgs = process.argv.slice(2).filter((argument) => argument !== "--");

console.log("Starting Vite with OpenRouter API endpoints...");

const vite = spawn(process.execPath, [viteCli, ...viteArgs], {
  cwd: rootDir,
  stdio: "inherit",
  windowsHide: true,
});

process.on("SIGINT", () => vite.kill("SIGINT"));
process.on("SIGTERM", () => vite.kill("SIGTERM"));

vite.on("exit", (code) => {
  process.exit(code ?? 0);
});
