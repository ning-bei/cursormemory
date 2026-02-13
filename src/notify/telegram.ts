import https from "https";
import { SocksProxyAgent } from "socks-proxy-agent";
import { TelegramConfig, getTelegramConfig } from "../config.js";

const API_BASE = "https://api.telegram.org/bot";

function getAgent(): SocksProxyAgent | undefined {
  const proxy =
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy;
  if (proxy) return new SocksProxyAgent(proxy);

  const configured = getTelegramConfig()?.socksProxy;
  if (configured) return new SocksProxyAgent(configured);

  return undefined;
}

function request(url: string, options: https.RequestOptions, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error("Request timed out"));
    });
    if (body) req.write(body);
    req.end();
  });
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
  parseMode?: "MarkdownV2" | "HTML"
): Promise<{ ok: boolean; description?: string }> {
  const url = `${API_BASE}${config.botToken}/sendMessage`;
  const payload: Record<string, string> = { chat_id: config.chatId, text };
  if (parseMode) payload.parse_mode = parseMode;
  const body = JSON.stringify(payload);

  const data = await request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    agent: getAgent(),
  }, body);

  return JSON.parse(data);
}

export async function getUpdates(
  botToken: string
): Promise<{ ok: boolean; result: Array<{ message?: { chat: { id: number }; from?: { first_name?: string } } }> }> {
  const url = `${API_BASE}${botToken}/getUpdates`;
  const data = await request(url, { method: "GET", agent: getAgent() });
  return JSON.parse(data);
}

export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
