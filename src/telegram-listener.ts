import { existsSync, mkdirSync, writeFileSync, appendFileSync } from "fs";
import { TelegramConfig } from "./config.js";
import { getUpdates, sendTelegramMessage } from "./notify/telegram.js";
import { DAILY_NOTES_DIR } from "./constants.js";

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

export interface ListenerHandle {
  stop: () => void;
}

export function startTelegramListener(
  config: TelegramConfig,
  log: (msg: string) => void = console.log
): ListenerHandle {
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

  return { stop: () => { running = false; } };
}
