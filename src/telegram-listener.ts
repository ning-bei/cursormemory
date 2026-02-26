import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, unlinkSync } from "fs";
import { TelegramConfig } from "./config.js";
import { getUpdates, sendTelegramMessage } from "./notify/telegram.js";
import { DAILY_NOTES_DIR, LISTENER_PID_PATH, LISTENER_OFFSET_PATH } from "./constants.js";

function todayDateString(tz?: string): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

function timestampString(tz?: string): string {
  return new Date().toLocaleString("en-US", {
    timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function appendToDaily(text: string, tz?: string): string {
  if (!existsSync(DAILY_NOTES_DIR)) {
    mkdirSync(DAILY_NOTES_DIR, { recursive: true });
  }

  const date = todayDateString(tz);
  const filePath = `${DAILY_NOTES_DIR}/${date}-daily-notes.md`;

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `# Daily Notes — ${date}\n\n`, "utf-8");
  }

  appendFileSync(filePath, `- **${timestampString(tz)}** ${text}\n`, "utf-8");
  return filePath;
}

// --- offset persistence ---

function loadOffset(): number | undefined {
  try {
    if (!existsSync(LISTENER_OFFSET_PATH)) return undefined;
    const val = parseInt(readFileSync(LISTENER_OFFSET_PATH, "utf-8").trim(), 10);
    return isNaN(val) ? undefined : val;
  } catch {
    return undefined;
  }
}

function saveOffset(offset: number): void {
  writeFileSync(LISTENER_OFFSET_PATH, String(offset), "utf-8");
}

// --- takeover lock ---

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killExistingListener(log: (msg: string) => void): void {
  if (!existsSync(LISTENER_PID_PATH)) return;
  const pid = parseInt(readFileSync(LISTENER_PID_PATH, "utf-8").trim(), 10);
  if (!isNaN(pid) && pid !== process.pid && isProcessAlive(pid)) {
    log(`Taking over from existing listener (PID ${pid})`);
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
}

function writePid(): void {
  writeFileSync(LISTENER_PID_PATH, String(process.pid), "utf-8");
}

function removePid(): void {
  try {
    if (existsSync(LISTENER_PID_PATH)) {
      const pid = parseInt(readFileSync(LISTENER_PID_PATH, "utf-8").trim(), 10);
      if (pid === process.pid) unlinkSync(LISTENER_PID_PATH);
    }
  } catch {}
}

// --- listener ---

export interface ListenerHandle {
  stop: () => void;
}

export function startTelegramListener(
  config: TelegramConfig,
  log: (msg: string) => void = console.log
): ListenerHandle {
  killExistingListener(log);
  writePid();

  let running = true;
  let offset = loadOffset();

  const poll = async () => {
    log(`Telegram listener started (chat ${config.chatId}, offset ${offset ?? "none"})`);
    while (running) {
      try {
        const resp = await getUpdates(config.botToken, { offset, timeout: 30 });
        if (!resp.ok || !resp.result?.length) continue;

        for (const update of resp.result) {
          // Double-check offset from disk in case another process updated it
          const diskOffset = loadOffset() ?? 0;
          if (update.update_id < diskOffset) {
            offset = diskOffset;
            continue;
          }

          offset = update.update_id + 1;
          saveOffset(offset);

          const text = update.message?.text;
          if (!text) continue;
          if (String(update.message!.chat.id) !== config.chatId) continue;

          appendToDaily(text, config.timezone);
          const date = todayDateString(config.timezone);
          log(`[${timestampString(config.timezone)}] ${text}`);

          await sendTelegramMessage(config, `✅ Noted in ${date}-daily-notes.md`);
        }
      } catch (err) {
        if (!running) break;
        log(`Telegram poll error: ${err}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };

  poll();

  return {
    stop: () => {
      running = false;
      removePid();
    },
  };
}
