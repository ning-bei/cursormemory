import chalk from "chalk";
import { CURSORMEMORY_HOME, DISTILL_PROMPT } from "../constants.js";
import { runCursorAgent, requireCursorCli } from "../cursor-cli.js";
import { saveState } from "../daemon/state.js";

export async function distillCommand(): Promise<void> {
  console.log(chalk.bold("Distilling memories...\n"));

  requireCursorCli();

  const prompt = DISTILL_PROMPT + CURSORMEMORY_HOME;
  const result = await runCursorAgent(prompt, CURSORMEMORY_HOME);

  const success = result.exitCode === 0;
  saveState({ lastDistill: new Date().toISOString(), success });

  if (success) {
    console.log(chalk.bold.green("\nDistillation complete. Check ~/cursormemory/MEMORY.md"));
  } else {
    console.log(chalk.red("\nDistillation failed. Check the output above."));
  }
}
