import chalk from "chalk";
import { getTelegramConfig } from "../config.js";
import { startTelegramListener, isListenerRunning } from "../telegram-listener.js";
import { DAILY_NOTES_DIR } from "../constants.js";

export async function listenCommand(): Promise<void> {
  const config = getTelegramConfig();
  if (!config) {
    console.error(chalk.red("Telegram not configured. Run: cursormemory notify setup --token <token>"));
    process.exit(1);
  }

  const check = isListenerRunning();
  if (check.running) {
    console.error(chalk.yellow(`Another listener is already running (PID ${check.pid}).`));
    console.error(chalk.dim("This is likely the daemon. Stop it first: cursormemory daemon stop"));
    process.exit(1);
  }

  console.log(chalk.green("Listening for Telegram messages..."));
  console.log(chalk.dim(`Daily notes → ${DAILY_NOTES_DIR}`));
  console.log(chalk.dim("Press Ctrl+C to stop\n"));

  const handle = startTelegramListener(config, (msg) => console.log(chalk.dim(msg)));
  if (!handle) process.exit(1);

  const shutdown = () => {
    handle.stop();
    console.log(chalk.dim("\nStopped listening."));
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise(() => {});
}
