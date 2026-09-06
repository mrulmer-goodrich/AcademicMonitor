import { spawn } from "node:child_process";
import path from "node:path";

const eslintBinary = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "eslint.cmd" : "eslint"
);
const eslintArgs = ["app", "components", "lib", "--ext", ".ts,.tsx", "--no-cache"];
const timeoutMs = 60_000;

const child = spawn(eslintBinary, eslintArgs, { stdio: "inherit" });
let timedOut = false;

const timeout = setTimeout(() => {
  timedOut = true;
  console.error(`ESLint exceeded ${timeoutMs / 1000} seconds and was stopped. Run the focused file directly to isolate the stall.`);
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
}, timeoutMs);

child.on("error", (error) => {
  clearTimeout(timeout);
  console.error(`Unable to start ESLint: ${error.message}`);
  process.exitCode = 1;
});

child.on("close", (code) => {
  clearTimeout(timeout);
  process.exitCode = timedOut ? 124 : (code ?? 1);
});
