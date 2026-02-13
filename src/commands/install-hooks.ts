import { existsSync, mkdirSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";
import chalk from "chalk";

const HOOKS_JSON = {
  version: 1,
  hooks: {
    stop: [{ command: ".cursor/hooks/save-memory.sh" }],
  },
};

const SAVE_MEMORY_SH = `#!/bin/bash
# OpenMemory: save conversation turn to daily memory file
openmemory _hook-save-memory 2>/dev/null || true
`;

export function installHooksToProject(projectPath: string): void {
  const cursorDir = join(projectPath, ".cursor");
  const hooksDir = join(cursorDir, "hooks");

  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hooksJsonPath = join(cursorDir, "hooks.json");
  writeFileSync(hooksJsonPath, JSON.stringify(HOOKS_JSON, null, 2) + "\n", "utf-8");

  const shPath = join(hooksDir, "save-memory.sh");
  writeFileSync(shPath, SAVE_MEMORY_SH, "utf-8");
  chmodSync(shPath, 0o755);
}

export async function installHooksCommand(): Promise<void> {
  const projectPath = process.cwd();
  installHooksToProject(projectPath);
  console.log(chalk.green("  ✓ Installed .cursor/hooks.json"));
  console.log(chalk.green("  ✓ Installed .cursor/hooks/save-memory.sh"));
  console.log(
    chalk.dim("\n  Cursor will now auto-save each conversation turn to memory/.")
  );
}
