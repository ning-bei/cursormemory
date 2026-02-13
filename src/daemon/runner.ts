#!/usr/bin/env node
import { unlinkSync, existsSync } from "fs";
import { CURSORMEMORY_HOME, DISTILL_PROMPT, DAEMON_PID_PATH } from "../constants.js";
import { runCursorAgent, checkCursorCli } from "../cursor-cli.js";
import { loadState, saveState, hasNewMaterial, intervalMs } from "./state.js";
import { getTelegramConfig } from "../config.js";
import { sendTelegramMessage } from "../notify/telegram.js";
import { generateBriefing } from "../notify/briefing.js";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 30_000;
const AGENT_TIMEOUT_MS = 10 * 60_000;
const TICK_MS = 60_000; // check every 60s

function localISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  const sign = off <= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return local.toISOString().replace("Z", `${sign}${hh}:${mm}`);
}

function log(msg: string): void {
  console.log(`[${localISO()}] ${msg}`);
}

function cleanup(): void {
  try {
    if (existsSync(DAEMON_PID_PATH)) unlinkSync(DAEMON_PID_PATH);
  } catch { /* ignore */ }
}

// --- timezone helpers ---

function nowInTz(tz: string): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: tz });
  return new Date(str);
}

function todayStr(tz: string): string {
  const d = nowInTz(tz);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentHHMM(tz: string): string {
  const d = nowInTz(tz);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// --- briefing schedule ---

function isBriefingDue(): boolean {
  const tg = getTelegramConfig();
  if (!tg?.briefingTime) return false;
  const tz = tg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const state = loadState();

  const today = todayStr(tz);
  if (state.lastBriefingDate === today) return false;

  const now = currentHHMM(tz);
  return now >= tg.briefingTime;
}

// --- distill schedule ---

function isDistillDue(): boolean {
  const state = loadState();
  if (!state.lastDistill) return true;
  const elapsed = Date.now() - new Date(state.lastDistill).getTime();
  return elapsed >= intervalMs(state);
}

// --- actions ---

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

    const reason = result.exitCode === 124 ? "timed out" : `exit ${result.exitCode}`;
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

async function sendBriefing(): Promise<void> {
  const tg = getTelegramConfig();
  if (!tg) {
    log("Telegram not configured, skipping briefing");
    return;
  }
  const tz = tg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    log("Generating briefing via Cursor agent...");
    const briefing = await generateBriefing();
    const result = await sendTelegramMessage(tg, briefing);
    if (result.ok) {
      log("Briefing sent via Telegram");
      saveState({ lastBriefingDate: todayStr(tz) });
    } else {
      log(`Telegram error: ${result.description}`);
    }
  } catch (err) {
    log(`Failed to send briefing: ${err}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- main loop ---

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

  const tg = getTelegramConfig();
  if (tg?.briefingTime) {
    const tz = tg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    log(`Briefing scheduled at ${tg.briefingTime} (${tz})`);
  }

  while (true) {
    // 1. Check briefing schedule
    if (isBriefingDue()) {
      log("Briefing time!");
      try {
        await sendBriefing();
      } catch (err) {
        log(`Briefing error: ${err}`);
      }
    }

    // 2. Check distill schedule
    if (isDistillDue() && hasNewMaterial()) {
      try {
        await distill();
      } catch (err) {
        log(`Distill error: ${err}`);
        saveState({ lastDistill: new Date().toISOString(), success: false });
      }
    }

    // 3. Sleep until next tick
    await sleep(TICK_MS);
  }
}

main().catch((err) => {
  log(`Fatal: ${err}`);
  cleanup();
  process.exit(1);
});
