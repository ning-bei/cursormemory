# openmemory

A CLI tool for building a **persistent memory system** for AI coding agents across projects and documents. Designed for [Cursor IDE](https://cursor.com), it gives your AI assistant long-term memory that survives session restarts.

## The Problem

AI agents start fresh every session. They forget decisions, context, and lessons learned. `openmemory` fixes this by:

- Automatically capturing conversation logs via Cursor hooks
- Maintaining per-project `MEMORY.md` files as curated long-term memory
- Syncing and indexing everything for semantic search with [qmd](https://github.com/tobi/qmd)
- Distilling raw notes into actionable knowledge using the Cursor agent

## How It Works

```
~/openmemory/
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
git clone <repo-url> && cd openmemory
npm install && npm link
```

Requires [Node.js](https://nodejs.org) 18+. Optional: [qmd](https://github.com/tobi/qmd) for search/indexing.

## Quick Start

```bash
# Initialize openmemory in your project
cd your-project
openmemory init

# That's it. Cursor will now auto-save conversations to memory.
```

`openmemory init` does the following:
- Creates `MEMORY.md` and `AGENTS.md` with memory instructions
- Installs Cursor hooks (`.cursor/hooks.json`) to auto-capture conversations
- Installs Cursor commands (`~/.cursor/commands/`)
- Registers the project in `~/openmemory/config.json`

## Commands

### Core

| Command | Description |
|---|---|
| `openmemory init` | Initialize openmemory in the current project |
| `openmemory sync` | Sync all project memories to `~/openmemory` |
| `openmemory distill` | Distill recent notes into `~/openmemory/MEMORY.md` via Cursor agent |
| `openmemory status` | Show openmemory status and project info |

### Search & Index (requires qmd)

| Command | Description |
|---|---|
| `openmemory index` | Index `~/openmemory` with qmd for semantic search |
| `openmemory search <query>` | Search memories using qmd |

```bash
openmemory search "authentication flow" --mode vsearch --num 5
openmemory index --force  # re-embed all documents
```

### Project Management

| Command | Description |
|---|---|
| `openmemory project add [path]` | Add a project (defaults to cwd) |
| `openmemory project remove <name>` | Remove a project |
| `openmemory project list` | List all tracked projects |

### Configuration

| Command | Description |
|---|---|
| `openmemory config set-api-key <key>` | Set Cursor API key |
| `openmemory config show` | Show current configuration |

### Setup

| Command | Description |
|---|---|
| `openmemory install-hooks` | Install Cursor hooks in the current project |
| `openmemory install-commands` | Install Cursor IDE commands to `~/.cursor/commands/` |

## Cursor Integration

### Hooks

After `openmemory init`, a Cursor hook is installed that runs at the end of each conversation turn. It parses the transcript and appends a summary (query, response, files touched, tools used) to `~/openmemory/projects/<name>/memory/YYYY-MM-DD.md`.

### Commands

The `/sync-openmemory-docs` Cursor command lets you fetch cloud documents (Yuque, web pages) and save them to `~/openmemory/documents/`.

### Agent Instructions

`AGENTS.md` tells the AI agent to read `MEMORY.md` at the start of every session and write down important things. The agent treats `MEMORY.md` as its long-term memory — decisions, lessons, context that should persist.

## Tech Stack

- **TypeScript** + Node.js
- **Commander** for CLI
- **Chalk** for terminal output
- **qmd** for semantic search (optional)
- **Cursor Agent CLI** for distillation (optional)

## Roadmap

- [ ] **Memory search in agent instructions** — Add qmd search to AGENTS.md instructions so the LLM automatically searches past experiences and knowledge when it needs context beyond the current project
- [ ] **Auto-distill daemon** — A background daemon process that periodically distills raw daily notes into curated `MEMORY.md`, so memory stays fresh without manual intervention
- [ ] **DingTalk morning briefing** — Send a daily morning message via DingTalk with today's plan, high-priority items, and pending tasks, based on recent memories and project status

## License

MIT
