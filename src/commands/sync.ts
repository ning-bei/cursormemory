import { existsSync, mkdirSync, cpSync, readdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { loadConfig } from "../config.js";
import { PROJECTS_DIR, DOCUMENTS_DIR, MEMORY_MD_FILENAME, MEMORY_DIR_NAME, OPENMEMORY_HOME } from "../constants.js";
import { runCursorAgent, requireCursorCli } from "../cursor-cli.js";

async function syncProjects(): Promise<void> {
  const config = loadConfig();

  if (config.projects.length === 0) {
    console.log(chalk.yellow("  No projects configured. Use `openmemory project add` or `openmemory init`."));
    return;
  }

  for (const project of config.projects) {
    const destDir = join(PROJECTS_DIR, project.name);
    mkdirSync(destDir, { recursive: true });

    console.log(chalk.dim(`  Syncing project: ${project.name}`));

    // Copy MEMORY.md
    const srcMemory = join(project.path, MEMORY_MD_FILENAME);
    if (existsSync(srcMemory)) {
      cpSync(srcMemory, join(destDir, MEMORY_MD_FILENAME));
      console.log(chalk.green(`    ✓ ${MEMORY_MD_FILENAME}`));
    }

    // Copy memory/ directory
    const srcMemoryDir = join(project.path, MEMORY_DIR_NAME);
    if (existsSync(srcMemoryDir)) {
      const destMemoryDir = join(destDir, MEMORY_DIR_NAME);
      mkdirSync(destMemoryDir, { recursive: true });
      cpSync(srcMemoryDir, destMemoryDir, { recursive: true });
      const files = readdirSync(srcMemoryDir).filter((f) => f.endsWith(".md"));
      console.log(chalk.green(`    ✓ ${MEMORY_DIR_NAME}/ (${files.length} files)`));
    }
  }
}

async function syncDocuments(): Promise<void> {
  const config = loadConfig();

  if (config.documents.length === 0) {
    console.log(chalk.dim("  No cloud documents configured. Use `openmemory doc add`."));
    return;
  }

  requireCursorCli();

  for (const doc of config.documents) {
    console.log(chalk.dim(`  Fetching document: ${doc.name}`));

    const today = new Date().toISOString().slice(0, 10);
    const filename = `${today}-${doc.name}.md`;
    const destPath = join(DOCUMENTS_DIR, filename);

    const mcpHint = doc.mcp ? `Use the ${doc.mcp} MCP tool to fetch the document.` : "";
    const prompt = [
      `Fetch the document at this URL: ${doc.url}`,
      mcpHint,
      `Save the full content as markdown to: ${destPath}`,
      `If the document has images, download and describe them.`,
      `Do not ask any questions, just fetch and save.`,
    ].join("\n");

    const result = await runCursorAgent(prompt, OPENMEMORY_HOME);
    if (result.exitCode === 0 && existsSync(destPath)) {
      console.log(chalk.green(`    ✓ Saved as ${filename}`));
    } else {
      console.log(chalk.red(`    ✗ Failed to fetch ${doc.name}`));
      if (result.output.trim()) {
        const lines = result.output.trim().split("\n").slice(-5);
        for (const line of lines) console.log(chalk.dim(`      ${line}`));
      }
    }
  }
}

export async function syncCommand(options: { projects?: boolean; docs?: boolean }): Promise<void> {
  const syncAll = !options.projects && !options.docs;

  console.log(chalk.bold("Syncing openmemory...\n"));

  if (syncAll || options.projects) {
    console.log(chalk.blue("Projects:"));
    await syncProjects();
    console.log();
  }

  if (syncAll || options.docs) {
    console.log(chalk.blue("Cloud Documents:"));
    await syncDocuments();
    console.log();
  }

  console.log(chalk.bold.green("Sync complete."));
}
