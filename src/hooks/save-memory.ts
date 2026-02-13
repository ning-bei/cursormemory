import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { MEMORY_DIR_NAME, OPENMEMORY_HOME } from "../constants.js";

const STATE_PATH = join(OPENMEMORY_HOME, ".hook-state.json");

interface HookInput {
  session_id?: string;
  conversation_id?: string;
  transcript_path?: string | null;
  workspace_roots?: string[];
  status?: string;
}

interface TranscriptEntry {
  role: string;
  message?: {
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
}

interface TurnData {
  query: string;
  response: string;
  filesEdited: string[];
  toolsUsed: string[];
}

// --- state management ---

interface HookState {
  [transcriptPath: string]: number;
}

function loadState(): HookState {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveState(state: HookState): void {
  if (!existsSync(OPENMEMORY_HOME)) mkdirSync(OPENMEMORY_HOME, { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state), "utf-8");
}

// --- stdin ---

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 5000);
  });
}

// --- helpers ---

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function extractUserQuery(text: string): string {
  const match = text.match(/<user_query>([\s\S]*?)<\/user_query>/);
  return match ? match[1].trim() : text.trim();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

function extractAssistantText(entry: TranscriptEntry): string {
  if (!entry.message?.content) return "";
  return entry.message.content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!.trim())
    .join("\n");
}

// --- parsing ---

function parseTurn(lines: string[]): TurnData | null {
  let query = "";
  let lastResponse = "";
  const filesEdited = new Set<string>();
  const toolsUsed = new Set<string>();

  for (const line of lines) {
    try {
      const entry: TranscriptEntry = JSON.parse(line);
      if (entry.role === "user" && entry.message?.content) {
        for (const block of entry.message.content) {
          if (block.type === "text" && block.text) {
            const q = extractUserQuery(block.text);
            if (q) query = q;
          }
        }
      }
      if (entry.role === "assistant" && entry.message?.content) {
        const text = extractAssistantText(entry);
        if (text) lastResponse = text;
        for (const block of entry.message.content) {
          if (block.type === "tool_use" && block.name) {
            toolsUsed.add(block.name);
            const input = block.input as Record<string, unknown>;
            if (input?.path && typeof input.path === "string") {
              filesEdited.add(input.path);
            }
          }
        }
      }
    } catch {
      // skip
    }
  }

  if (!query) return null;

  return {
    query,
    response: lastResponse,
    filesEdited: [...filesEdited],
    toolsUsed: [...toolsUsed],
  };
}

// --- formatting ---

function formatTurnEntry(turn: TurnData): string {
  const lines: string[] = [];
  lines.push(`### ${nowTime()} — Conversation`);
  lines.push("");
  lines.push(`**Query:** ${turn.query}`);
  lines.push("");

  if (turn.response) {
    lines.push(`**Response:** ${turn.response}`);
    lines.push("");
  }

  if (turn.filesEdited.length > 0) {
    lines.push(
      `**Files touched:** ${turn.filesEdited.map((f) => `\`${basename(f)}\``).join(", ")}`
    );
    lines.push("");
  }

  if (turn.toolsUsed.length > 0) {
    lines.push(`**Tools:** ${turn.toolsUsed.join(", ")}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function findProjectRoot(workspaceRoots: string[]): string | null {
  for (const root of workspaceRoots) {
    if (existsSync(join(root, MEMORY_DIR_NAME))) return root;
  }
  return workspaceRoots[0] || null;
}

// --- main ---

export async function hookSaveMemory(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) return;

    let input: HookInput;
    try {
      input = JSON.parse(raw);
    } catch {
      return;
    }

    if (!input.transcript_path || !existsSync(input.transcript_path)) return;

    // Read transcript and determine new lines
    const allLines = readFileSync(input.transcript_path, "utf-8")
      .split("\n")
      .filter((l) => l.trim());

    const state = loadState();
    const offset = state[input.transcript_path] || 0;
    const newLines = allLines.slice(offset);

    if (newLines.length === 0) return;

    // Update state to mark all lines as processed
    state[input.transcript_path] = allLines.length;
    saveState(state);

    // Parse only the new turn
    const turn = parseTurn(newLines);
    if (!turn) return;

    const projectRoot = findProjectRoot(input.workspace_roots || []);
    if (!projectRoot) return;

    const memDir = join(projectRoot, MEMORY_DIR_NAME);
    if (!existsSync(memDir)) mkdirSync(memDir, { recursive: true });

    const dailyFile = join(memDir, `${today()}.md`);
    const isNew = !existsSync(dailyFile);

    let content = "";
    if (isNew) {
      content += `# ${today()} — Daily Notes\n\n`;
    }
    content += formatTurnEntry(turn);

    appendFileSync(dailyFile, content, "utf-8");
  } catch {
    // hooks should never crash
  }
}
