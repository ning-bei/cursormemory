#!/usr/bin/env node
import { unlinkSync, existsSync } from "fs";
import { CURSORMEMORY_HOME, DISTILL_PROMPT, DAEMON_PID_PATH } from "../constants.js";
import { runCursorAgent, checkCursorCli } from "../cursor-cli.js";
import { loadState, saveState, hasNewMaterial, intervalMs } from "./state.js";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 30_000;
const AGENT_TIMEOUT_MS = 10 * 60_000; // 10 minutes

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
  const prompt = DISTILL_PROMPT + CURSORMEMORY_HOME;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    log(`Starting distill (attempt ${attempt}/${MAX_RETRIES + 1})...`);
    const result = await runCursorAgent(prompt, CURSORMEMORY_HOME, {
      timeoutMs: AGENT_TIMEOUT_MS,
    });

    if (result.exitCode === 0) {
      saveState({ lastDistill: new Date().toISOString(), success: true });
      log("Distill succeeded");
      return true;
    }

    const reason =
      result.exitCode === 124
        ? "timed out"
        : `exit ${result.exitCode}`;
    log(`Distill failed (${reason}): ${result.output.slice(-200).trim()}`);

    if (attempt <= MAX_RETRIES) {
      log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  saveState({ lastDistill: new Date().toISOString(), success: false });
  log("Distill failed after all retries");
  return false;
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
