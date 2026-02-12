import { execSync } from "child_process";
import chalk from "chalk";
import { QMD_COLLECTION_NAME } from "../constants.js";

function checkQmd(): boolean {
  try {
    execSync("which qmd", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function searchCommand(
  query: string,
  options: { mode?: string; num?: string; full?: boolean; json?: boolean }
): Promise<void> {
  if (!checkQmd()) {
    console.log(chalk.red("qmd not found. Install it: bun install -g github:tobi/qmd"));
    return;
  }

  const mode = options.mode ?? "search";
  const validModes = ["search", "vsearch", "query"];
  if (!validModes.includes(mode)) {
    console.log(chalk.red(`Invalid mode "${mode}". Use: ${validModes.join(", ")}`));
    return;
  }

  const args = [mode, `"${query}"`, "-c", QMD_COLLECTION_NAME];
  if (options.num) args.push("-n", options.num);
  if (options.full) args.push("--full");
  if (options.json) args.push("--json");

  const cmd = `qmd ${args.join(" ")}`;

  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    // qmd exits non-zero on no results
  }
}
