import { existsSync, writeFileSync, mkdirSync, readFileSync, appendFileSync } from "fs";
import { basename, resolve } from "path";
import chalk from "chalk";
import { addProject } from "../config.js";
import { AGENTS_MD_FILENAME, MEMORY_MD_FILENAME, MEMORY_DIR_NAME, MEMORY_INSTRUCTION } from "../constants.js";
import { installHooksToProject } from "./install-hooks.js";
import { installCommandsAction } from "./install-commands.js";

export async function initCommand(options: { name?: string }): Promise<void> {
  const projectPath = resolve(process.cwd());
  const projectName = options.name ?? basename(projectPath);

  console.log(chalk.bold(`Initializing openmemory in: ${projectPath}`));

  // Create MEMORY.md
  const memoryPath = resolve(projectPath, MEMORY_MD_FILENAME);
  if (!existsSync(memoryPath)) {
    writeFileSync(memoryPath, `# ${projectName} — Memory\n\nLong-term curated memory for this project.\n`);
    console.log(chalk.green(`  Created ${MEMORY_MD_FILENAME}`));
  } else {
    console.log(chalk.dim(`  ${MEMORY_MD_FILENAME} already exists, skipping`));
  }

  // Create memory/ directory
  const memoryDir = resolve(projectPath, MEMORY_DIR_NAME);
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
    console.log(chalk.green(`  Created ${MEMORY_DIR_NAME}/`));
  } else {
    console.log(chalk.dim(`  ${MEMORY_DIR_NAME}/ already exists, skipping`));
  }

  // Add memory instructions to AGENTS.md
  const agentsPath = resolve(projectPath, AGENTS_MD_FILENAME);
  if (!existsSync(agentsPath)) {
    writeFileSync(agentsPath, `# ${projectName} — Agent Instructions\n\n${MEMORY_INSTRUCTION}\n`);
    console.log(chalk.green(`  Created ${AGENTS_MD_FILENAME} with memory instructions`));
  } else {
    const content = readFileSync(agentsPath, "utf-8");
    if (content.includes("## Memory")) {
      console.log(chalk.dim(`  ${AGENTS_MD_FILENAME} already has memory section, skipping`));
    } else {
      appendFileSync(agentsPath, `\n\n${MEMORY_INSTRUCTION}\n`);
      console.log(chalk.green(`  Appended memory instructions to ${AGENTS_MD_FILENAME}`));
    }
  }

  // Install Cursor hooks
  installHooksToProject(projectPath);
  console.log(chalk.green(`  Installed Cursor hooks (.cursor/hooks.json)`));

  // Install Cursor commands
  await installCommandsAction();

  // Register in config.json
  addProject(projectName, projectPath);
  console.log(chalk.green(`  Registered project "${projectName}" in ~/openmemory/config.json`));

  console.log(chalk.bold.green("\nDone! Project initialized with openmemory."));
}
