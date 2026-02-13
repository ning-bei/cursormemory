import chalk from "chalk";
import { CURSORMEMORY_HOME, DISTILL_PROMPT } from "../constants.js";
import { runCursorAgent, requireCursorCli } from "../cursor-cli.js";

export async function distillCommand(): Promise<void> {
  console.log(chalk.bold("Distilling memories...\n"));

  requireCursorCli();

  const prompt = DISTILL_PROMPT + CURSORMEMORY_HOME;
  const result = await runCursorAgent(prompt, CURSORMEMORY_HOME);

  if (result.exitCode === 0) {
    console.log(chalk.bold.green("\nDistillation complete. Check ~/cursormemory/MEMORY.md"));
  } else {
    console.log(chalk.red("\nDistillation failed. Check the output above."));
  }
}
