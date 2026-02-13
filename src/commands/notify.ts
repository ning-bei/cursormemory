import chalk from "chalk";
import { getTelegramConfig, setTelegramConfig } from "../config.js";
import { sendTelegramMessage, getUpdates } from "../notify/telegram.js";
import { generateBriefing } from "../notify/briefing.js";

export async function notifySetupCommand(opts: { token?: string; chatId?: string }): Promise<void> {
  const token = opts.token;
  if (!token) {
    console.error(chalk.red("Please provide --token <bot-token>"));
    process.exit(1);
  }

  // Manual chat-id provided — skip API call
  if (opts.chatId) {
    setTelegramConfig({ botToken: token, chatId: opts.chatId });
    console.log(chalk.green(`Telegram configured!`));
    console.log(chalk.dim(`  Chat ID: ${opts.chatId}`));
    console.log(chalk.dim(`  Run: cursormemory notify test`));
    return;
  }

  console.log(chalk.dim("Fetching updates from your bot..."));
  console.log(chalk.dim("(Make sure you've sent a message to the bot first)"));

  try {
    const data = await getUpdates(token);
    if (!data.ok || !data.result?.length) {
      console.error(chalk.red("No messages found. Send any message to your bot first, then retry."));
      process.exit(1);
    }

    const msg = data.result[data.result.length - 1].message;
    if (!msg) {
      console.error(chalk.red("No message in updates. Send a text message to the bot."));
      process.exit(1);
    }

    const chatId = String(msg.chat.id);
    const name = msg.from?.first_name ?? "unknown";

    setTelegramConfig({ botToken: token, chatId });
    console.log(chalk.green(`Telegram configured!`));
    console.log(chalk.dim(`  Chat ID: ${chatId} (${name})`));
    console.log(chalk.dim(`  Run: cursormemory notify test`));
  } catch (err) {
    console.error(chalk.red(`Failed to reach Telegram API: ${err}`));
    console.error(chalk.dim("Tip: use --chat-id <id> to configure manually"));
    process.exit(1);
  }
}

export async function notifyTestCommand(): Promise<void> {
  const config = getTelegramConfig();
  if (!config) {
    console.error(chalk.red("Telegram not configured. Run: cursormemory notify setup --token <token>"));
    process.exit(1);
  }

  console.log(chalk.dim("Sending test message..."));
  try {
    const result = await sendTelegramMessage(
      config,
      "<b>✅ cursormemory</b>\n\nTelegram notifications are working!",
      "HTML"
    );
    if (result.ok) {
      console.log(chalk.green("Test message sent!"));
    } else {
      console.error(chalk.red(`Telegram error: ${result.description}`));
    }
  } catch (err) {
    console.error(chalk.red(`Failed: ${err}`));
  }
}

export async function notifyBriefingCommand(): Promise<void> {
  const config = getTelegramConfig();
  if (!config) {
    console.error(chalk.red("Telegram not configured. Run: cursormemory notify setup --token <token>"));
    process.exit(1);
  }

  console.log(chalk.dim("Generating briefing via Cursor agent..."));
  try {
    const briefing = await generateBriefing();
    console.log(chalk.dim("Sending..."));
    const result = await sendTelegramMessage(config, briefing);
    if (result.ok) {
      console.log(chalk.green("Briefing sent!"));
    } else {
      console.error(chalk.red(`Telegram error: ${result.description}`));
      console.error(chalk.dim("Raw message:"));
      console.error(briefing);
    }
  } catch (err) {
    console.error(chalk.red(`Failed: ${err}`));
  }
}

export async function notifySendCommand(message: string): Promise<void> {
  const config = getTelegramConfig();
  if (!config) {
    console.error(chalk.red("Telegram not configured. Run: cursormemory notify setup --token <token>"));
    process.exit(1);
  }

  try {
    const result = await sendTelegramMessage(config, message, "HTML");
    if (result.ok) {
      console.log(chalk.green("Message sent!"));
    } else {
      console.error(chalk.red(`Telegram error: ${result.description}`));
    }
  } catch (err) {
    console.error(chalk.red(`Failed: ${err}`));
  }
}
