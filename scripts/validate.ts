import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const python = resolve(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
if (!existsSync(python)) {
  console.error("Set up validation first: python3 -m venv .venv && .venv/bin/python -m pip install -r requirements-validation.txt");
  process.exit(1);
}

// Run every layer even if one fails so a single invocation reports all failures.
const commands = [
  [process.execPath, "run", "check"],
  [python, "-m", "unittest", "discover", "-s", "scripts", "-p", "test_*.py"],
  [python, "scripts/validate.py"],
];
let failed = false;
for (const command of commands) {
  const result = Bun.spawnSync(command, { cwd: root, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
