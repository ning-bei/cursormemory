# cursormemory

A CLI tool for building a **persistent memory system** for AI coding agents across projects and documents. Designed for [Cursor IDE](https://cursor.com), it gives your AI assistant long-term memory that survives session restarts.

## The Problem

AI agents start fresh every session. They forget decisions, context, and lessons learned. `cursormemory` fixes this by:

- **Auto-capturing** every conversation via Cursor hooks into daily note files
- **Maintaining** per-project `MEMORY.md` files as curated long-term memory
- **Distilling** raw notes into actionable knowledge using the Cursor agent CLI
- **Indexing** everything for semantic search with [qmd](https://github.com/tobi/qmd)
- **Notifying** you via Telegram with morning briefings and accepting notes from your phone
- **Running a background daemon** that continuously distills and briefs on a schedule

## How It Works

### Architecture

```
~/cursormemory/                         ← Central memory store
├── config.json                         ← Projects, Telegram, API keys
├── MEMORY.md                           ← Global distilled long-term memory
├── .daemon-state.json                  ← Daemon last-run timestamps
├── .hook-state.json                    ← Hook transcript offsets
├── projects/
│   ├── my-app/
│   │   ├── MEMORY.md                   ← Synced from project's MEMORY.md
│   │   └── memory/
│   │       ├── 2026-01-13.md           ← Auto-captured daily conversation logs
│   │       └── 2026-01-14.md
│   └── another-project/
│       └── ...
└── documents/
    ├── 2026-01-13-PRD.md               ← Synced cloud documents (Yuque, web)
    ├── daily-notes/
    │   └── 2026-01-13-daily-notes.md   ← Notes received from Telegram
    └── ...
```

### The Memory Lifecycle

1. **Capture** — A Cursor hook fires at the end of each conversation turn. It reads the JSONL transcript, extracts the user query, assistant response, files edited, and tools used, then appends a structured entry to `~/cursormemory/projects/<name>/memory/YYYY-MM-DD.md`. A stateful offset tracker (`.hook-state.json`) ensures each turn is captured exactly once.

2. **Sync** — `cursormemory sync` copies each project's local `MEMORY.md` into the central store so all project memories are consolidated under `~/cursormemory/projects/`.

3. **Distill** — `cursormemory distill` invokes the Cursor agent CLI (`agent`) against the `~/cursormemory` directory. The agent reads all raw daily notes, project memories, and synced documents, then updates the global `MEMORY.md` — condensing scattered notes into structured, long-term knowledge and pruning outdated entries.

4. **Search** — `cursormemory search` leverages [qmd](https://github.com/tobi/qmd) for semantic search across all indexed memories. Supports vector search (`vsearch`), keyword search, and natural language queries.

5. **Notify** — After distillation, a briefing is generated and sent to your Telegram. You can also send notes from Telegram back into `cursormemory` via the listener.

6. **Daemon** — A background process automates the distill → brief cycle on a configurable interval (default 6 hours), with automatic retries and file-change detection to skip unnecessary runs.

### Agent Integration

Each session, the agent reads `MEMORY.md` (instructed by `AGENTS.md`) for context. It can also search past memories with `cursormemory search`. The agent writes important decisions, lessons, and context back to `MEMORY.md`, closing the loop.

## Installation

```bash
git clone <repo-url> && cd cursormemory
npm install && npm link
```

Requires [Node.js](https://nodejs.org) 18+. Optional dependencies:
- [qmd](https://github.com/tobi/qmd) — semantic search and indexing
- [Cursor Agent CLI](https://docs.cursor.com/cli) (`agent`) — distillation and briefing generation

## Quick Start

```bash
cd your-project
cursormemory init
```

This single command:
- Creates `MEMORY.md` and `AGENTS.md` with memory instructions for the AI agent
- Installs a Cursor hook (`.cursor/hooks/save-memory.sh` + `.cursor/hooks.json`) that auto-captures conversations on every turn
- Installs the `/sync-cursormemory-docs` Cursor command to `~/.cursor/commands/`
- Registers the project in `~/cursormemory/config.json`

From now on, every Cursor conversation in this project is automatically logged.

## Features

### Automatic Conversation Capture

When Cursor finishes a conversation turn, a hook script runs `cursormemory _hook-save-memory`. It:
- Reads the conversation transcript (JSONL format)
- Tracks an offset per transcript so only new turns are processed
- Parses each turn: user query (from `<user_query>` tags), assistant response, `filesEdited` (from tool use paths), `toolsUsed` (from tool names)
- Resolves which project the workspace belongs to via `config.json`
- Appends a formatted entry to `~/cursormemory/projects/<project>/memory/YYYY-MM-DD.md`

### Distillation via Cursor Agent

`cursormemory distill` delegates to the Cursor agent CLI to read all raw memories and produce a condensed `MEMORY.md`. The agent runs in `~/cursormemory` with a specialized prompt that instructs it to:
- Read all `projects/*/memory/*.md` files and `documents/*`
- Update `~/cursormemory/MEMORY.md` with distilled knowledge
- Remove stale or redundant entries
- Preserve important decisions, patterns, and lessons

### Background Daemon

The daemon (`cursormemory daemon start`) runs a continuous loop:
- **Ticks every 60 seconds**, checking if a distill or briefing is due
- **Distill check**: Compares `lastDistill` timestamp against the configured interval (default 6h) and verifies new material exists by scanning file modification times
- **Briefing check**: If a `briefingTime` is configured (e.g. `"09:00"`), sends a morning briefing once per day at that time
- **Retries**: Up to 2 retries with 30s delay on distill failures, 10-minute timeout per run
- **Telegram listener**: If configured, the daemon also starts polling for incoming Telegram messages

Install as a macOS launch agent with `cursormemory daemon install` to auto-start on login.

### Telegram Integration

Full two-way Telegram integration:

- **Briefings** — After each distill, a summary is generated by the Cursor agent and sent to your Telegram chat (truncated to ~4000 chars)
- **Custom messages** — Send any message with `cursormemory notify send "..."`
- **Listener** — `cursormemory notify listen` polls for incoming Telegram messages and appends them to `~/cursormemory/documents/daily-notes/YYYY-MM-DD-daily-notes.md`, with acknowledgment replies
- **Proxy support** — Works behind SOCKS proxies via `ALL_PROXY`, `HTTPS_PROXY`, or the `socksProxy` config field

### Semantic Search & Indexing

Powered by [qmd](https://github.com/tobi/qmd):

- `cursormemory index` — Creates/updates a qmd collection pointing at `~/cursormemory`, runs `qmd update` and `qmd embed`
- `cursormemory search <query>` — Three modes:
  - `search` (default) — keyword search
  - `vsearch` — vector/semantic search
  - `query` — natural language query answered by qmd
- Options: `-n <count>`, `--full` (show full content), `--json` (machine-readable output)

The agent can call `cursormemory search` directly from within a Cursor session to recall past context.

### Document Syncing

The `/sync-cursormemory-docs` Cursor command (installed to `~/.cursor/commands/`) lets you fetch external documents:
- **Yuque** docs via `yuque-mcp`
- **Web pages** via `WebFetch`
- **Images** via `image-downloader` MCP

Documents are saved to `~/cursormemory/documents/YYYY-MM-DD-{name}.md` and included in future distill cycles.

## Commands

### Core

| Command                | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `cursormemory init`    | Initialize cursormemory in the current project                        |
| `cursormemory sync`    | Sync all project MEMORY.md files to `~/cursormemory`                  |
| `cursormemory distill` | Distill raw notes into `~/cursormemory/MEMORY.md` via Cursor agent    |
| `cursormemory status`  | Show cursormemory status and project info                             |

### Daemon

| Command                         | Description                                         |
| ------------------------------- | --------------------------------------------------- |
| `cursormemory daemon start`     | Start the background auto-distill daemon            |
| `cursormemory daemon stop`      | Stop the daemon                                     |
| `cursormemory daemon status`    | Show daemon status, last distill time               |
| `cursormemory daemon install`   | Install as macOS launch agent (auto-start on login) |
| `cursormemory daemon uninstall` | Remove the macOS launch agent                       |

```bash
cursormemory daemon start --interval 4  # distill every 4 hours
cursormemory daemon status
```

### Notifications

| Command                                                    | Description                                   |
| ---------------------------------------------------------- | --------------------------------------------- |
| `cursormemory notify setup --token <token>`                | Configure Telegram bot (auto-detects chat ID) |
| `cursormemory notify setup --token <token> --chat-id <id>` | Configure with explicit chat ID               |
| `cursormemory notify test`                                 | Send a test message                           |
| `cursormemory notify briefing`                             | Generate and send a morning briefing          |
| `cursormemory notify send <message>`                       | Send a custom message                         |
| `cursormemory notify listen`                               | Listen for Telegram messages → daily notes    |

### Search & Index

| Command                       | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `cursormemory index`          | Index `~/cursormemory` with qmd for semantic search |
| `cursormemory search <query>` | Search memories using qmd                           |

```bash
cursormemory search "authentication flow" --mode vsearch --num 5
cursormemory search "how did we handle caching?" --mode query
cursormemory index --force  # re-embed all documents
```

### Project Management

| Command                              | Description                     |
| ------------------------------------ | ------------------------------- |
| `cursormemory project add [path]`    | Add a project (defaults to cwd) |
| `cursormemory project remove <name>` | Remove a project                |
| `cursormemory project list`          | List all tracked projects       |

### Configuration

| Command                                 | Description                |
| --------------------------------------- | -------------------------- |
| `cursormemory config set-api-key <key>` | Set Cursor API key         |
| `cursormemory config show`              | Show current configuration |

### Setup

| Command                         | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `cursormemory install-hooks`    | Install Cursor hooks in the current project          |
| `cursormemory install-commands` | Install Cursor IDE commands to `~/.cursor/commands/` |

## Tech Stack

- **TypeScript** + Node.js
- **Commander** for CLI
- **Chalk** for terminal output
- **qmd** for semantic search (optional)
- **Cursor Agent CLI** (`agent`) for distillation and briefing (optional)

## License

MIT