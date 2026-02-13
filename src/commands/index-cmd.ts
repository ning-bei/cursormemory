import { execFileSync } from "child_process";
import chalk from "chalk";
import { CURSORMEMORY_HOME, QMD_COLLECTION_NAME } from "../constants.js";
import { checkQmd } from "../utils.js";

export async function indexCommand(options: { force?: boolean }): Promise<void> {
  console.log(chalk.bold("Indexing cursormemory with qmd...\n"));

  if (!checkQmd()) {
    console.log(chalk.red("qmd not found. Install it: bun install -g github:tobi/qmd"));
    return;
  }

  // Ensure collection exists
  try {
    const existing = execFileSync("qmd", ["collection", "list"], { encoding: "utf-8" });
    if (!existing.includes(QMD_COLLECTION_NAME)) {
      console.log(chalk.dim(`  Adding collection "${QMD_COLLECTION_NAME}"...`));
      execFileSync("qmd", ["collection", "add", CURSORMEMORY_HOME, "--name", QMD_COLLECTION_NAME], { stdio: "inherit" });
    } else {
      console.log(chalk.dim(`  Collection "${QMD_COLLECTION_NAME}" exists`));
    }
  } catch {
    console.log(chalk.dim(`  Adding collection "${QMD_COLLECTION_NAME}"...`));
    execFileSync("qmd", ["collection", "add", CURSORMEMORY_HOME, "--name", QMD_COLLECTION_NAME], { stdio: "inherit" });
  }

  // Update index
  console.log(chalk.dim("  Updating index..."));
  execFileSync("qmd", ["update"], { stdio: "inherit" });

  // Generate embeddings
  console.log(chalk.dim("  Generating embeddings..."));
  const embedArgs = options.force ? ["embed", "-f"] : ["embed"];
  execFileSync("qmd", embedArgs, { stdio: "inherit" });

  // Add context
  try {
    execFileSync("qmd", [
      "context", "add", `qmd://${QMD_COLLECTION_NAME}`,
      "Personal knowledge base - project memories, documents, and distilled learnings",
    ], { stdio: "inherit" });
  } catch {
    // context may already exist
  }

  console.log(chalk.bold.green("\nIndexing complete."));
}
