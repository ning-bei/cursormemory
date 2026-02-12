import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { loadConfig } from "../config.js";
import { OPENMEMORY_HOME, PROJECTS_DIR, DOCUMENTS_DIR, MEMORY_PATH } from "../constants.js";

export async function statusCommand(): Promise<void> {
  console.log(chalk.bold("openmemory status\n"));
  console.log(`  Home: ${chalk.cyan(OPENMEMORY_HOME)}`);

  if (existsSync(MEMORY_PATH)) {
    const stat = statSync(MEMORY_PATH);
    console.log(`  MEMORY.md: ${chalk.green("exists")} (${formatDate(stat.mtime)})`);
  } else {
    console.log(`  MEMORY.md: ${chalk.dim("not created yet")}`);
  }

  const config = loadConfig();

  console.log(chalk.bold(`\n  Projects: ${config.projects.length}`));
  for (const p of config.projects) {
    const synced = existsSync(join(PROJECTS_DIR, p.name));
    const status = synced ? chalk.green("synced") : chalk.yellow("not synced");
    console.log(`    ${chalk.cyan(p.name)} [${status}]`);
  }

  if (existsSync(DOCUMENTS_DIR)) {
    const docs = readdirSync(DOCUMENTS_DIR).filter((f) => f.endsWith(".md"));
    if (docs.length > 0) {
      console.log(chalk.bold(`\n  Documents: ${docs.length} files`));
      for (const d of docs.slice(-5)) {
        console.log(chalk.dim(`    ${d}`));
      }
      if (docs.length > 5) console.log(chalk.dim(`    ... and ${docs.length - 5} more`));
    }
  }

  if (existsSync(PROJECTS_DIR)) {
    const syncedProjects = readdirSync(PROJECTS_DIR).filter((f) =>
      statSync(join(PROJECTS_DIR, f)).isDirectory()
    );
    if (syncedProjects.length > 0) {
      console.log(chalk.bold(`\n  Synced project data:`));
      for (const name of syncedProjects) {
        const memDir = join(PROJECTS_DIR, name, "memory");
        const memCount = existsSync(memDir)
          ? readdirSync(memDir).filter((f) => f.endsWith(".md")).length
          : 0;
        console.log(chalk.dim(`    ${name}: ${memCount} daily files`));
      }
    }
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
