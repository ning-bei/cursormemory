import { homedir } from "os";
import { join } from "path";

export const CURSORMEMORY_HOME = join(homedir(), "cursormemory");
export const CONFIG_PATH = join(CURSORMEMORY_HOME, "config.json");
export const MEMORY_PATH = join(CURSORMEMORY_HOME, "MEMORY.md");
export const PROJECTS_DIR = join(CURSORMEMORY_HOME, "projects");
export const DOCUMENTS_DIR = join(CURSORMEMORY_HOME, "documents");
export const QMD_COLLECTION_NAME = "cursormemory";

// Daemon
export const DAEMON_PID_PATH = join(CURSORMEMORY_HOME, ".daemon.pid");
export const DAEMON_LOG_PATH = join(CURSORMEMORY_HOME, ".daemon.log");
export const DAEMON_STATE_PATH = join(CURSORMEMORY_HOME, ".daemon-state.json");
export const DAEMON_DEFAULT_INTERVAL_HOURS = 6;
export const LAUNCHD_LABEL = "com.cursormemory.daemon";
export const LAUNCHD_PLIST_PATH = join(
  homedir(),
  "Library",
  "LaunchAgents",
  `${LAUNCHD_LABEL}.plist`
);

export const AGENTS_MD_FILENAME = "AGENTS.md";
export const MEMORY_MD_FILENAME = "MEMORY.md";
export const MEMORY_DIR_NAME = "memory";

export const MEMORY_INSTRUCTION = `## Every Session

Before doing anything else:

Read \`MEMORY.md\` for context on this project.

Don't ask permission. Just do it.

## Memory

You wake up fresh each session. \`MEMORY.md\` is your continuity.

Capture what matters. Decisions, context, things to remember. Skip the secrets unless asked to keep them.

### 🧠 MEMORY.md - Your Long-Term Memory

- You can **read, edit, and update** MEMORY.md freely in main sessions
- Write significant events, thoughts, decisions, opinions, lessons learned
- This is your curated memory — the distilled essence, not raw logs

### 🔍 Search Past Memories

When you need prior experience, context, or knowledge related to the current task — **search for it**.

Run: \`cursormemory search "<your query>" --mode query -n 5 --full\`

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

// Briefing
export const BRIEFING_OUTPUT_PATH = join(CURSORMEMORY_HOME, ".briefing.txt");
export const BRIEFING_PROMPT = `You are a daily briefing writer for a developer. Your tone is like an old friend who's also a sharp mentor — warm, a bit humorous, chill but no-nonsense. Think "buddy who happens to be a staff engineer and genuinely cares about your day."

Instructions:
1. Read MEMORY.md to understand what's going on
2. Write a morning briefing and save it to the file ".briefing.txt" in the cursormemory directory
3. The briefing should be plain text (Telegram-friendly), under 3500 characters
4. Keep it concise and scannable — no walls of text

Structure (adapt freely, skip sections that don't apply):
- A short greeting / vibe check
- 🚨 Stuff that needs attention NOW (overdue, blocked, due today)
- 🎯 What to focus on today (top 2-3 priorities)
- 🔄 In-progress things to keep an eye on
- 💡 A quick insight, reminder, or friendly nudge based on patterns you see
- Sign off with something encouraging or funny

Rules:
- Be specific — reference actual tasks, names, dates from memory
- Don't be generic or corporate. Be real.
- If things are overdue, call it out directly but kindly ("hey that merchant API was due 3 days ago, might want to chase that down")
- If everything looks good, say so and keep it short
- NEVER use HTML tags or markdown formatting — plain text only with emoji for structure
- Write the output to: `;

export const DISTILL_PROMPT = `You are a memory distiller. Your job is to review recent memory files and update the long-term memory.

Instructions:
1. Read through recent \`projects/*/memory/*.md\` files, \`projects/*/MEMORY.md\` files, and \`documents/*.md\` files in the cursormemory directory
2. Identify significant events, lessons, or insights worth keeping long-term
3. Update MEMORY.md with distilled learnings
4. Remove outdated info from MEMORY.md that's no longer relevant

Think of it like a human reviewing their journal and updating their mental model. Daily files are raw notes; MEMORY.md is curated wisdom.

The cursormemory directory is at: `;
