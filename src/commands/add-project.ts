import { resolve, basename } from "path";
import { existsSync } from "fs";
import chalk from "chalk";
import { addProject, removeProject, loadConfig } from "../config.js";

export async function addProjectCommand(pathArg: string | undefined, options: { name?: string }): Promise<void> {
  const projectPath = resolve(pathArg ?? process.cwd());
  const projectName = options.name ?? basename(projectPath);

  if (!existsSync(projectPath)) {
    console.log(chalk.red(`Path does not exist: ${projectPath}`));
    return;
  }

  addProject(projectName, projectPath);
  console.log(chalk.green(`Added project "${projectName}" → ${projectPath}`));
}

export async function removeProjectCommand(name: string): Promise<void> {
  const config = loadConfig();
  const found = config.projects.find((p) => p.name === name);
  if (!found) {
    console.log(chalk.yellow(`Project "${name}" not found in config.`));
    return;
  }
  removeProject(name);
  console.log(chalk.green(`Removed project "${name}"`));
}

export async function listProjectsCommand(): Promise<void> {
  const config = loadConfig();
  if (config.projects.length === 0) {
    console.log(chalk.dim("No projects configured."));
    return;
  }
  console.log(chalk.bold("Projects:\n"));
  for (const p of config.projects) {
    console.log(`  ${chalk.cyan(p.name)} → ${p.path}`);
  }
}
