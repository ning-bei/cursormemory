import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "fs";
import { join } from "path";
import {
  DAEMON_STATE_PATH,
  DAEMON_DEFAULT_INTERVAL_HOURS,
  CURSORMEMORY_HOME,
  PROJECTS_DIR,
} from "../constants.js";

export interface DaemonState {
  lastDistill?: string;
  success?: boolean;
  intervalHours: number;
}

function defaultState(): DaemonState {
  return { intervalHours: DAEMON_DEFAULT_INTERVAL_HOURS };
}

export function loadState(): DaemonState {
  if (!existsSync(DAEMON_STATE_PATH)) return defaultState();
  try {
    return { ...defaultState(), ...JSON.parse(readFileSync(DAEMON_STATE_PATH, "utf-8")) };
  } catch {
    return defaultState();
  }
}

export function saveState(patch: Partial<DaemonState>): void {
  const state = { ...loadState(), ...patch };
  writeFileSync(DAEMON_STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function walkMemoryFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMemoryFiles(full));
    else if (entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

export function hasNewMaterial(): boolean {
  const state = loadState();
  if (!state.lastDistill) return true;

  const since = new Date(state.lastDistill);
  const dirs = [PROJECTS_DIR, join(CURSORMEMORY_HOME, "documents")];

  for (const dir of dirs) {
    for (const file of walkMemoryFiles(dir)) {
      if (statSync(file).mtime > since) return true;
    }
  }
  return false;
}

export function intervalMs(state: DaemonState): number {
  return (state.intervalHours ?? DAEMON_DEFAULT_INTERVAL_HOURS) * 3600_000;
}
