import { existsSync, mkdirSync, cpSync, readdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { loadConfig } from "../config.js";
import { PROJECTS_DIR, MEMORY_MD_FILENAME, MEMORY_DIR_NAME } from "../constants.js";

export async function syncCommand(): Promise<void> {
  console.log(chalk.bold("Syncing openmemory...\n"));

  const config = loadConfig();

  if (config.projects.length === 0) {
    console.log(chalk.yellow("  No projects configured. Use `openmemory project add` or `openmemory init`."));
    return;
  }

  for (const project of config.projects) {
    const destDir = join(PROJECTS_DIR, project.name);
    mkdirSync(destDir, { recursive: true });

    console.log(chalk.dim(`  Syncing project: ${project.name}`));

    const srcMemory = join(project.path, MEMORY_MD_FILENAME);
    if (existsSync(srcMemory)) {
      cpSync(srcMemory, join(destDir, MEMORY_MD_FILENAME));
      console.log(chalk.green(`    ✓ ${MEMORY_MD_FILENAME}`));
    }

    const srcMemoryDir = join(project.path, MEMORY_DIR_NAME);
    if (existsSync(srcMemoryDir)) {
      const destMemoryDir = join(destDir, MEMORY_DIR_NAME);
      mkdirSync(destMemoryDir, { recursive: true });
      cpSync(srcMemoryDir, destMemoryDir, { recursive: true });
      const files = readdirSync(srcMemoryDir).filter((f) => f.endsWith(".md"));
      console.log(chalk.green(`    ✓ ${MEMORY_DIR_NAME}/ (${files.length} files)`));
    }
  }

  console.log(chalk.bold.green("\nSync complete."));
}
