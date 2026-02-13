import { homedir } from "os";
import { join } from "path";

export const OPENMEMORY_HOME = join(homedir(), "openmemory");
export const CONFIG_PATH = join(OPENMEMORY_HOME, "config.json");
export const MEMORY_PATH = join(OPENMEMORY_HOME, "MEMORY.md");
export const PROJECTS_DIR = join(OPENMEMORY_HOME, "projects");
export const DOCUMENTS_DIR = join(OPENMEMORY_HOME, "documents");
export const QMD_COLLECTION_NAME = "openmemory";

export const AGENTS_MD_FILENAME = "AGENTS.md";
export const MEMORY_MD_FILENAME = "MEMORY.md";
export const MEMORY_DIR_NAME = "memory";

export const MEMORY_INSTRUCTION = `## Every Session

Before doing anything else:

Read \`MEMORY.md\` for context on this project.

Don't ask permission. Just do it.

## Memory

You wake up fresh each session. \`MEMORY.md\` is your continuity.

Raw conversation logs are automatically captured to \`~/openmemory/\` by Cursor hooks — you don't need to write daily notes.

Capture what matters. Decisions, context, things to remember. Skip the secrets unless asked to keep them.

### 🧠 MEMORY.md - Your Long-Term Memory

- You can **read, edit, and update** MEMORY.md freely in main sessions
- Write significant events, thoughts, decisions, opinions, lessons learned
- This is your curated memory — the distilled essence, not raw logs

### 🔍 Search Past Memories

When you need prior experience, context, or knowledge related to the current task — **search for it**.

Run: \`openmemory search "<your query>" --mode query -n 5 --full\`

Do this when:
- You're about to solve a problem you (or the user) might have tackled before
- You need background knowledge, past decisions, or lessons learned
- The user references something from a previous session

Don't ask permission. If you think past memory might help, just search.

### 📝 Write It Down - No "Mental Notes"!

- **Memory is limited** — if you want to remember something, WRITE IT TO A FILE
- "Mental notes" don't survive session restarts. Files do.
- When someone says "remember this" → update \`MEMORY.md\`
- When you learn a lesson → update AGENTS.md, TOOLS.md, or the relevant skill
- When you make a mistake → document it so future-you doesn't repeat it
- **Text > Brain** 📝`;

export const DISTILL_PROMPT = `You are a memory distiller. Your job is to review recent memory files and update the long-term memory.

Instructions:
1. Read through recent \`projects/*/memory/*.md\` files, \`projects/*/MEMORY.md\` files, and \`documents/*.md\` files in the openmemory directory
2. Identify significant events, lessons, or insights worth keeping long-term
3. Update MEMORY.md with distilled learnings
4. Remove outdated info from MEMORY.md that's no longer relevant

Think of it like a human reviewing their journal and updating their mental model. Daily files are raw notes; MEMORY.md is curated wisdom.

The openmemory directory is at: `;
