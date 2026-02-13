# cursormemory

A CLI tool for building a **persistent memory system** for AI coding agents across projects and documents. Designed for [Cursor IDE](https://cursor.com), it gives your AI assistant long-term memory that survives session restarts.

## The Problem

AI agents start fresh every session. They forget decisions, context, and lessons learned. `cursormemory` fixes this by:

- Automatically capturing conversation logs via Cursor hooks
- Maintaining per-project `MEMORY.md` files as curated long-term memory
- Syncing and indexing everything for semantic search with [qmd](https://github.com/tobi/qmd)
- Distilling raw notes into actionable knowledge using the Cursor agent

## How It Works

```
~/cursormemory/
├── config.json              # Projects & settings
├── MEMORY.md                # Global long-term memory
├── projects/
│   ├── my-app/
│   │   ├── MEMORY.md        # Project-specific memory
│   │   └── memory/
│   │       ├── 2026-01-13.md # Auto-captured daily notes
│   │       └── ...
│   └── ...
└── documents/
    ├── 2026-01-13-PRD.md    # Synced cloud documents
    └── ...
```

Each session, the agent reads `MEMORY.md` for context. Conversations are automatically logged to daily files. Over time, raw notes get distilled into curated memory.

## Installation

```bash
# Clone and install globally
git clone <repo-url> && cd cursormemory
npm install && npm link
```

Requires [Node.js](https://nodejs.org) 18+. Optional: [qmd](https://github.com/tobi/qmd) for search/indexing.

## Quick Start

```bash
# Initialize cursormemory in your project
cd your-project
cursormemory init

# That's it. Cursor will now auto-save conversations to memory.
```

`cursormemory init` does the following:
- Creates `MEMORY.md` and `AGENTS.md` with memory instructions
- Installs Cursor hooks (`.cursor/hooks.json`) to auto-capture conversations
- Installs Cursor commands (`~/.cursor/commands/`)
- Registers the project in `~/cursormemory/config.json`

## Commands

### Core

| Command | Description |
|---|---|
| `cursormemory init` | Initialize cursormemory in the current project |
| `cursormemory sync` | Sync all project memories to `~/cursormemory` |
| `cursormemory distill` | Distill recent notes into `~/cursormemory/MEMORY.md` via Cursor agent |
| `cursormemory status` | Show cursormemory status and project info |

### Daemon (auto-distill)

| Command | Description |
|---|---|
| `cursormemory daemon start` | Start the background auto-distill daemon |
| `cursormemory daemon stop` | Stop the daemon |
| `cursormemory daemon status` | Show daemon status, last distill time |
| `cursormemory daemon install` | Install as macOS launch agent (auto-start on login) |
| `cursormemory daemon uninstall` | Remove the macOS launch agent |

```bash
cursormemory daemon start --interval 4  # distill every 4 hours
cursormemory daemon status
```

### Notifications (Telegram)

| Command | Description |
|---|---|
| `cursormemory notify setup --token <token>` | Configure Telegram bot (auto-detects chat ID) |
| `cursormemory notify setup --token <token> --chat-id <id>` | Configure manually |
| `cursormemory notify test` | Send a test message |
| `cursormemory notify briefing` | Send a morning briefing from current memories |
| `cursormemory notify send <message>` | Send a custom message |

The daemon automatically sends a briefing via Telegram after each distill cycle.

### Search & Index (requires qmd)

| Command | Description |
|---|---|
| `cursormemory index` | Index `~/cursormemory` with qmd for semantic search |
| `cursormemory search <query>` | Search memories using qmd |

```bash
cursormemory search "authentication flow" --mode vsearch --num 5
cursormemory index --force  # re-embed all documents
```

### Project Management

| Command | Description |
|---|---|
| `cursormemory project add [path]` | Add a project (defaults to cwd) |
| `cursormemory project remove <name>` | Remove a project |
| `cursormemory project list` | List all tracked projects |

### Configuration

| Command | Description |
|---|---|
| `cursormemory config set-api-key <key>` | Set Cursor API key |
| `cursormemory config show` | Show current configuration |

### Setup

| Command | Description |
|---|---|
| `cursormemory install-hooks` | Install Cursor hooks in the current project |
| `cursormemory install-commands` | Install Cursor IDE commands to `~/.cursor/commands/` |

## Cursor Integration

### Hooks

After `cursormemory init`, a Cursor hook is installed that runs at the end of each conversation turn. It parses the transcript and appends a summary (query, response, files touched, tools used) to `~/cursormemory/projects/<name>/memory/YYYY-MM-DD.md`.

### Commands

The `/sync-cursormemory-docs` Cursor command lets you fetch cloud documents (Yuque, web pages) and save them to `~/cursormemory/documents/`.

### Agent Instructions

`AGENTS.md` tells the AI agent to read `MEMORY.md` at the start of every session and write down important things. The agent treats `MEMORY.md` as its long-term memory — decisions, lessons, context that should persist.

## Tech Stack

- **TypeScript** + Node.js
- **Commander** for CLI
- **Chalk** for terminal output
- **qmd** for semantic search (optional)
- **Cursor Agent CLI** for distillation (optional)

## Roadmap

- [x] **Memory search in agent instructions** — Add qmd search to AGENTS.md instructions so the LLM automatically searches past experiences and knowledge when it needs context beyond the current project
- [x] **Auto-distill daemon** — A background daemon process that periodically distills raw daily notes into curated `MEMORY.md`, so memory stays fresh without manual intervention
- [x] **Telegram morning briefing** — Send a daily briefing via Telegram with high-priority items, in-progress work, open issues, and key metrics, based on distilled memories

## License

MIT
