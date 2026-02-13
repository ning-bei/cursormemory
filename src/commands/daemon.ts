import { spawn, execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, openSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import {
  DAEMON_PID_PATH,
  DAEMON_LOG_PATH,
  DAEMON_STATE_PATH,
  DAEMON_DEFAULT_INTERVAL_HOURS,
  LAUNCHD_LABEL,
  LAUNCHD_PLIST_PATH,
} from "../constants.js";
import { loadState, saveState } from "../daemon/state.js";

function readPid(): number | null {
  if (!existsSync(DAEMON_PID_PATH)) return null;
  const raw = readFileSync(DAEMON_PID_PATH, "utf-8").trim();
  const pid = parseInt(raw, 10);
  return isNaN(pid) ? null : pid;
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function resolveBin(): string {
  try {
    return execSync("which cursormemory", { encoding: "utf-8" }).trim();
  } catch {
    // fallback: the dist/cli.js next to this file
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return join(__dirname, "..", "cli.js");
  }
}

// --- start ---

export function daemonStartCommand(opts: { interval?: string }): void {
  const pid = readPid();
  if (pid && isRunning(pid)) {
    console.log(chalk.yellow(`Daemon already running (PID ${pid})`));
    return;
  }

  if (opts.interval) {
    const hours = parseFloat(opts.interval);
    if (isNaN(hours) || hours <= 0) {
      console.error(chalk.red("Invalid interval. Provide a positive number of hours."));
      process.exit(1);
    }
    saveState({ intervalHours: hours });
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const runnerScript = join(__dirname, "..", "daemon", "runner.js");

  const logFd = openSync(DAEMON_LOG_PATH, "a");
  const child = spawn(process.execPath, [runnerScript], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();

  writeFileSync(DAEMON_PID_PATH, String(child.pid), "utf-8");
  const state = loadState();
  console.log(chalk.green(`Daemon started (PID ${child.pid})`));
  console.log(chalk.dim(`  Interval: ${state.intervalHours}h`));
  console.log(chalk.dim(`  Log: ${DAEMON_LOG_PATH}`));
}

// --- stop ---

export function daemonStopCommand(): void {
  const pid = readPid();
  if (!pid || !isRunning(pid)) {
    console.log(chalk.yellow("Daemon is not running."));
    if (existsSync(DAEMON_PID_PATH)) unlinkSync(DAEMON_PID_PATH);
    return;
  }
  process.kill(pid, "SIGTERM");
  unlinkSync(DAEMON_PID_PATH);
  console.log(chalk.green(`Daemon stopped (PID ${pid})`));
}

// --- status ---

export function daemonStatusCommand(): void {
  const pid = readPid();
  const alive = pid !== null && isRunning(pid);
  const state = loadState();

  console.log(chalk.bold("Auto-distill daemon"));
  console.log(`  Status:    ${alive ? chalk.green(`running (PID ${pid})`) : chalk.dim("stopped")}`);
  console.log(`  Interval:  ${state.intervalHours}h`);

  if (state.lastDistill) {
    const ago = timeSince(new Date(state.lastDistill));
    const result = state.success ? chalk.green("success") : chalk.red("failed");
    console.log(`  Last run:  ${ago} ago (${result})`);
  } else {
    console.log(`  Last run:  ${chalk.dim("never")}`);
  }

  if (existsSync(DAEMON_LOG_PATH)) {
    console.log(`  Log:       ${DAEMON_LOG_PATH}`);
  }
  if (existsSync(DAEMON_STATE_PATH)) {
    console.log(`  State:     ${DAEMON_STATE_PATH}`);
  }
}

// --- install (launchd) ---

export function daemonInstallCommand(): void {
  const bin = resolveBin();
  const state = loadState();

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${bin}</string>
    <string>daemon</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>${state.intervalHours * 3600}</integer>
  <key>StandardOutPath</key>
  <string>${DAEMON_LOG_PATH}</string>
  <key>StandardErrorPath</key>
  <string>${DAEMON_LOG_PATH}</string>
</dict>
</plist>
`;

  const dir = dirname(LAUNCHD_PLIST_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(LAUNCHD_PLIST_PATH, plist, "utf-8");

  try {
    execSync(`launchctl unload "${LAUNCHD_PLIST_PATH}" 2>/dev/null`, { stdio: "ignore" });
  } catch { /* ignore */ }
  execSync(`launchctl load "${LAUNCHD_PLIST_PATH}"`);

  console.log(chalk.green("Daemon installed as macOS launch agent."));
  console.log(chalk.dim(`  Plist: ${LAUNCHD_PLIST_PATH}`));
  console.log(chalk.dim("  The daemon will start on login and run periodically."));
}

// --- uninstall ---

export function daemonUninstallCommand(): void {
  if (!existsSync(LAUNCHD_PLIST_PATH)) {
    console.log(chalk.yellow("Launch agent not installed."));
    return;
  }
  try {
    execSync(`launchctl unload "${LAUNCHD_PLIST_PATH}"`, { stdio: "ignore" });
  } catch { /* ignore */ }
  unlinkSync(LAUNCHD_PLIST_PATH);
  console.log(chalk.green("Launch agent removed."));
}

// --- helpers ---

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

