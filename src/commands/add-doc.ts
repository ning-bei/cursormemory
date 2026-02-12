import chalk from "chalk";
import { addDocument, removeDocument, loadConfig } from "../config.js";

export async function addDocCommand(url: string, options: { name: string; mcp?: string }): Promise<void> {
  addDocument(options.name, url, options.mcp);
  console.log(chalk.green(`Added document "${options.name}" → ${url}`));
  if (options.mcp) {
    console.log(chalk.dim(`  MCP server: ${options.mcp}`));
  }
}

export async function removeDocCommand(name: string): Promise<void> {
  const config = loadConfig();
  const found = config.documents.find((d) => d.name === name);
  if (!found) {
    console.log(chalk.yellow(`Document "${name}" not found in config.`));
    return;
  }
  removeDocument(name);
  console.log(chalk.green(`Removed document "${name}"`));
}

export async function listDocsCommand(): Promise<void> {
  const config = loadConfig();
  if (config.documents.length === 0) {
    console.log(chalk.dim("No documents configured."));
    return;
  }
  console.log(chalk.bold("Documents:\n"));
  for (const d of config.documents) {
    const mcpLabel = d.mcp ? chalk.dim(` [${d.mcp}]`) : "";
    console.log(`  ${chalk.cyan(d.name)} → ${d.url}${mcpLabel}`);
  }
}
