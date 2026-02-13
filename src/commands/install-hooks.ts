import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";
import chalk from "chalk";

const HOOK_ENTRY = { command: ".cursor/hooks/save-memory.sh" };

const SAVE_MEMORY_SH = `#!/bin/bash
# CursorMemory: save conversation turn to daily memory file
cursormemory _hook-save-memory 2>/dev/null || true
`;

interface HooksConfig {
  version?: number;
  hooks?: { [event: string]: Array<{ command: string }> };
}

function mergeHooksJson(existing: HooksConfig): HooksConfig {
  const merged = { ...existing, version: existing.version ?? 1 };
  if (!merged.hooks) merged.hooks = {};
  if (!merged.hooks.stop) merged.hooks.stop = [];
  const alreadyInstalled = merged.hooks.stop.some(
    (h) => h.command === HOOK_ENTRY.command
  );
  if (!alreadyInstalled) {
    merged.hooks.stop.push(HOOK_ENTRY);
  }
  return merged;
}

export function installHooksToProject(projectPath: string): void {
  const cursorDir = join(projectPath, ".cursor");
  const hooksDir = join(cursorDir, "hooks");

  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hooksJsonPath = join(cursorDir, "hooks.json");
  let config: HooksConfig = {};
  if (existsSync(hooksJsonPath)) {
    try {
      config = JSON.parse(readFileSync(hooksJsonPath, "utf-8"));
    } catch {
      config = {};
    }
  }
  const merged = mergeHooksJson(config);
  writeFileSync(hooksJsonPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");

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
