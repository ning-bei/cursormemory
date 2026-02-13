import chalk from "chalk";
import { setCursorApiKey, getCursorApiKey, loadConfig } from "../config.js";
import { CONFIG_PATH } from "../constants.js";

export async function setApiKeyCommand(key: string): Promise<void> {
  setCursorApiKey(key);
  const masked = key.slice(0, 4) + "..." + key.slice(-4);
  console.log(chalk.green(`CURSOR_API_KEY saved: ${masked}`));
  console.log(chalk.dim(`  Stored in ${CONFIG_PATH}`));
}

export async function showConfigCommand(): Promise<void> {
  const config = loadConfig();
  const apiKey = getCursorApiKey();

  console.log(chalk.bold("cursormemory config\n"));
  console.log(`  Config path: ${chalk.cyan(CONFIG_PATH)}`);

  if (apiKey) {
    const masked = apiKey.slice(0, 4) + "..." + apiKey.slice(-4);
    const source = process.env.CURSOR_API_KEY ? "env" : "config";
    console.log(`  CURSOR_API_KEY: ${chalk.green(masked)} (${source})`);
  } else {
    console.log(`  CURSOR_API_KEY: ${chalk.yellow("not set")}`);
    console.log(chalk.dim("    Set it with: cursormemory config set-api-key <key>"));
  }

  console.log(`  Projects: ${config.projects.length}`);
}
