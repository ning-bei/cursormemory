import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { CONFIG_PATH, CURSORMEMORY_HOME, PROJECTS_DIR, DOCUMENTS_DIR } from "./constants.js";

export interface ProjectConfig {
  name: string;
  path: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  socksProxy?: string;
  briefingTime?: string;   // "HH:MM" e.g. "09:30"
  timezone?: string;        // IANA e.g. "Asia/Shanghai"
}

export interface CursorMemoryConfig {
  cursorApiKey?: string;
  telegram?: TelegramConfig;
  projects: ProjectConfig[];
}

function defaultConfig(): CursorMemoryConfig {
  return { projects: [] };
}

export function ensureDirectories(): void {
  for (const dir of [CURSORMEMORY_HOME, PROJECTS_DIR, DOCUMENTS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

export function loadConfig(): CursorMemoryConfig {
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

export function saveConfig(config: CursorMemoryConfig): void {
  ensureDirectories();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function addProject(name: string, projectPath: string): CursorMemoryConfig {
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

export function removeProject(name: string): CursorMemoryConfig {
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

export function setTelegramConfig(telegram: TelegramConfig): void {
  const config = loadConfig();
  config.telegram = telegram;
  saveConfig(config);
}

export function getTelegramConfig(): TelegramConfig | undefined {
  return loadConfig().telegram;
}
