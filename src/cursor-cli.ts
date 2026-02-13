import { execSync, spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";
import { getCursorApiKey } from "./config.js";

export function checkCursorCli(): boolean {
  try {
    execSync("which agent", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function checkAuth(): { ok: boolean; hint: string } {
  // env var or config
  if (getCursorApiKey() || process.env.CURSOR_AUTH_TOKEN) {
    return { ok: true, hint: getCursorApiKey() ? "config/env" : "env" };
  }

  // check for stored session from previous `agent` login
  const authPaths = [
    join(homedir(), ".cursor-agent", "auth.json"),
    join(homedir(), ".config", "cursor-agent", "auth.json"),
    join(homedir(), ".cursor", "auth", "session.json"),
  ];
  for (const p of authPaths) {
    if (existsSync(p)) return { ok: true, hint: "stored session" };
  }

  // can't confirm — we'll attempt anyway and let agent report the real error
  return { ok: false, hint: "unknown" };
}

export function requireCursorCli(): void {
  if (!checkCursorCli()) {
    console.error(chalk.red("Error: Cursor CLI (agent) not found."));
    console.error(chalk.dim("  Install it: curl https://cursor.com/install -fsSL | bash"));
    process.exit(1);
  }

  const auth = checkAuth();
  if (!auth.ok) {
    console.log(chalk.yellow("Warning: Could not confirm Cursor CLI authentication."));
    console.log(chalk.dim("  If the agent fails, authenticate first by running:"));
    console.log(chalk.dim("    agent                          # interactive login"));
    console.log(chalk.dim("    export CURSOR_API_KEY=<key>    # or set API key"));
    console.log();
  }
}

export function runCursorAgent(
  prompt: string,
  cwd: string,
  opts: { model?: string; mode?: string; timeoutMs?: number } = {}
): Promise<{ exitCode: number; output: string }> {
  const model = opts.model ?? "opus-4.6";
  const args = ["-p", prompt, "--model", model, "--approve-mcps"];
  if (opts.mode) args.push("--mode", opts.mode);

  return new Promise((resolve) => {
    console.log(chalk.dim("  Running Cursor agent..."));
    const apiKey = getCursorApiKey();
    const env = { ...process.env, ...(apiKey ? { CURSOR_API_KEY: apiKey } : {}) };
    const proc = spawn("agent", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });

    let output = "";
    let stderr = "";
    let killed = false;
    let resolved = false;

    const finish = (exitCode: number) => {
      if (resolved) return;
      resolved = true;
      if (timeout) clearTimeout(timeout);
      // Drain remaining pipe data briefly, then resolve
      setTimeout(() => {
        if (killed) {
          resolve({ exitCode: 124, output: output + stderr + "\n[timed out]" });
          return;
        }
        if (exitCode !== 0 && stderr.toLowerCase().includes("auth")) {
          console.error(chalk.red("\n  Authentication error from Cursor CLI."));
          console.error(chalk.dim("  Run `agent` once to login, or set CURSOR_API_KEY."));
        }
        // Destroy pipes so orphaned child processes don't keep us hanging
        proc.stdout?.destroy();
        proc.stderr?.destroy();
        resolve({ exitCode, output: output + stderr });
      }, 500);
    };

    const timeout = opts.timeoutMs
      ? setTimeout(() => {
          killed = true;
          proc.kill("SIGTERM");
          setTimeout(() => proc.kill("SIGKILL"), 5000);
        }, opts.timeoutMs)
      : null;

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      output += text;
      process.stdout.write(chalk.dim("  " + text));
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(chalk.dim("  " + text));
    });

    // Use 'exit' instead of 'close' — 'close' waits for all pipes to close,
    // but the agent CLI can spawn orphaned worker processes that inherit the
    // pipe FDs, causing 'close' to never fire.
    proc.on("exit", (code) => {
      finish(code ?? 1);
    });

    proc.on("error", () => {
      if (timeout) clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        resolve({ exitCode: 1, output: "Failed to spawn Cursor agent CLI" });
      }
    });
  });
}
