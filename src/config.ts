import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { CONFIG_PATH, OPENMEMORY_HOME, PROJECTS_DIR, DOCUMENTS_DIR } from "./constants.js";

export interface ProjectConfig {
  name: string;
  path: string;
}

export interface OpenMemoryConfig {
  cursorApiKey?: string;
  projects: ProjectConfig[];
}

function defaultConfig(): OpenMemoryConfig {
  return { projects: [] };
}

export function ensureDirectories(): void {
  for (const dir of [OPENMEMORY_HOME, PROJECTS_DIR, DOCUMENTS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

export function loadConfig(): OpenMemoryConfig {
  ensureDirectories();
  if (!existsSync(CONFIG_PATH)) {
    const config = defaultConfig();
    saveConfig(config);
    return config;
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(config: OpenMemoryConfig): void {
  ensureDirectories();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function addProject(name: string, projectPath: string): OpenMemoryConfig {
  const config = loadConfig();
  const existing = config.projects.find((p) => p.name === name);
  if (existing) {
    existing.path = projectPath;
  } else {
    config.projects.push({ name, path: projectPath });
  }
  saveConfig(config);
  return config;
}

export function removeProject(name: string): OpenMemoryConfig {
  const config = loadConfig();
  config.projects = config.projects.filter((p) => p.name !== name);
  saveConfig(config);
  return config;
}


export function setCursorApiKey(key: string): void {
  const config = loadConfig();
  config.cursorApiKey = key;
  saveConfig(config);
}

export function getCursorApiKey(): string | undefined {
  return process.env.CURSOR_API_KEY || loadConfig().cursorApiKey;
}
