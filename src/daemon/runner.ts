#!/usr/bin/env node
import { unlinkSync, existsSync } from "fs";
import { CURSORMEMORY_HOME, DISTILL_PROMPT, DAEMON_PID_PATH } from "../constants.js";
import { runCursorAgent, checkCursorCli } from "../cursor-cli.js";
import { loadState, saveState, hasNewMaterial, intervalMs } from "./state.js";

function log(msg: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function cleanup(): void {
  try {
    if (existsSync(DAEMON_PID_PATH)) unlinkSync(DAEMON_PID_PATH);
  } catch { /* ignore */ }
}

async function distill(): Promise<boolean> {
  log("Starting distill...");
  const prompt = DISTILL_PROMPT + CURSORMEMORY_HOME;
  const result = await runCursorAgent(prompt, CURSORMEMORY_HOME);
  const ok = result.exitCode === 0;
  saveState({ lastDistill: new Date().toISOString(), success: ok });
  log(`Distill ${ok ? "succeeded" : "failed"} (exit ${result.exitCode})`);
  return ok;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  log("Daemon started (PID " + process.pid + ")");

  if (!checkCursorCli()) {
    log("Error: Cursor CLI (agent) not found. Exiting.");
    cleanup();
    process.exit(1);
  }

  process.on("SIGTERM", () => {
    log("Received SIGTERM, shutting down");
    cleanup();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    log("Received SIGINT, shutting down");
    cleanup();
    process.exit(0);
  });

  // Main loop
  while (true) {
    const state = loadState();
    const interval = intervalMs(state);

    if (hasNewMaterial()) {
      try {
        await distill();
      } catch (err) {
        log(`Distill error: ${err}`);
        saveState({ lastDistill: new Date().toISOString(), success: false });
      }
    } else {
      log("No new material since last distill, skipping");
    }

    log(`Sleeping ${(interval / 3600_000).toFixed(1)}h until next check...`);
    await sleep(interval);
  }
}

main().catch((err) => {
  log(`Fatal: ${err}`);
  cleanup();
  process.exit(1);
});
