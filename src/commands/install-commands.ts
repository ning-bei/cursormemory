import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";

const CURSOR_COMMANDS_DIR = join(homedir(), ".cursor", "commands");

const SYNC_DOCS_COMMAND = `# sync-openmemory-docs

Fetch a cloud document and save it to \`~/openmemory/documents/\`.

The user will provide a document URL and a name. Use the appropriate MCP tool to fetch the content:
- For \`aliyuque.antfin.com\` URLs, use the \`yuque-mcp\` MCP tools to fetch the document.
- For other URLs, use WebFetch.

Steps:
1. Ask user for the document URL and a short name (if not already provided in the prompt).
2. Fetch the full document content using the appropriate MCP tool.
3. If the document has images, use the \`image-downloader\` MCP to download and read them. Include image descriptions in the markdown.
4. Save the content as markdown to \`~/openmemory/documents/YYYY-MM-DD-{name}.md\` (using today's date).
5. Print a summary of what was saved.

Notes:
- Do not skip images. Download and describe every image.
- If a file with today's date and the same name already exists, overwrite it.
- If the fetch fails, report the error clearly.
`;

const commands: Record<string, string> = {
  "sync-openmemory-docs.md": SYNC_DOCS_COMMAND,
};

export async function installCommandsAction(): Promise<void> {
  if (!existsSync(CURSOR_COMMANDS_DIR)) {
    mkdirSync(CURSOR_COMMANDS_DIR, { recursive: true });
  }

  for (const [filename, content] of Object.entries(commands)) {
    const dest = join(CURSOR_COMMANDS_DIR, filename);
    writeFileSync(dest, content, "utf-8");
    console.log(chalk.green(`  ✓ Installed ${filename}`));
  }

  console.log(chalk.dim(`\n  Commands installed to ${CURSOR_COMMANDS_DIR}`));
  console.log(chalk.dim(`  Use /sync-openmemory-docs in Cursor IDE to fetch documents.`));
}
