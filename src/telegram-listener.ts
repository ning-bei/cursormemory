import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, unlinkSync } from "fs";
import { TelegramConfig } from "./config.js";
import { getUpdates, sendTelegramMessage } from "./notify/telegram.js";
import { DAILY_NOTES_DIR, LISTENER_PID_PATH } from "./constants.js";

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

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function isListenerRunning(): { running: boolean; pid?: number } {
  if (!existsSync(LISTENER_PID_PATH)) return { running: false };
  const pid = parseInt(readFileSync(LISTENER_PID_PATH, "utf-8").trim(), 10);
  if (isNaN(pid) || !isProcessAlive(pid)) {
    try { unlinkSync(LISTENER_PID_PATH); } catch {}
    return { running: false };
  }
  return { running: true, pid };
}

function acquireLock(): boolean {
  const check = isListenerRunning();
  if (check.running) return false;
  writeFileSync(LISTENER_PID_PATH, String(process.pid), "utf-8");
  return true;
}

function releaseLock(): void {
  try {
    if (existsSync(LISTENER_PID_PATH)) {
      const pid = parseInt(readFileSync(LISTENER_PID_PATH, "utf-8").trim(), 10);
      if (pid === process.pid) unlinkSync(LISTENER_PID_PATH);
    }
  } catch {}
}

export interface ListenerHandle {
  stop: () => void;
}

export function startTelegramListener(
  config: TelegramConfig,
  log: (msg: string) => void = console.log
): ListenerHandle | null {
  if (!acquireLock()) {
    const { pid } = isListenerRunning();
    log(`Telegram listener already running (PID ${pid}), skipping`);
    return null;
  }

  let running = true;
  let offset: number | undefined;

  const poll = async () => {
    log(`Telegram listener started (chat ${config.chatId})`);
    while (running) {
      try {
        const resp = await getUpdates(config.botToken, { offset, timeout: 30 });
        if (!resp.ok || !resp.result?.length) continue;

        for (const update of resp.result) {
          offset = update.update_id + 1;

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
      releaseLock();
    },
  };
}
