#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { hookSaveMemory, syncCommand } from "./hooks/save-memory.js";
import { distillCommand } from "./commands/distill.js";
import { indexCommand } from "./commands/index-cmd.js";
import { addProjectCommand, removeProjectCommand, listProjectsCommand } from "./commands/add-project.js";
import { searchCommand } from "./commands/search.js";
import { statusCommand } from "./commands/status.js";
import { setApiKeyCommand, showConfigCommand } from "./commands/config-cmd.js";
import { installCommandsAction } from "./commands/install-commands.js";
import { installHooksCommand } from "./commands/install-hooks.js";
import {
  daemonStartCommand,
  daemonStopCommand,
  daemonStatusCommand,
  daemonInstallCommand,
  daemonUninstallCommand,
} from "./commands/daemon.js";
import {
  notifySetupCommand,
  notifyTestCommand,
  notifyBriefingCommand,
  notifySendCommand,
} from "./commands/notify.js";

const program = new Command();

program
  .name("cursormemory")
  .description("A CLI tool for building a persistent memory system across projects and documents")
  .version("0.1.0");

// init
program
  .command("init")
  .description("Initialize cursormemory in the current project (creates MEMORY.md, AGENTS.md, hooks)")
  .option("-n, --name <name>", "Project name (defaults to directory name)")
  .action(initCommand);

// sync
program
  .command("sync")
  .description("Sync project memories to ~/cursormemory")
  .action(syncCommand);

// distill
program
  .command("distill")
  .description("Distill recent memories into ~/cursormemory/MEMORY.md using Cursor agent")
  .action(distillCommand);

// index
program
  .command("index")
  .description("Index ~/cursormemory with qmd for search")
  .option("-f, --force", "Force re-embed all documents")
  .action(indexCommand);

// search
program
  .command("search <query>")
  .description("Search cursormemory using qmd")
  .option("-m, --mode <mode>", "Search mode: search, vsearch, query", "search")
  .option("-n, --num <count>", "Number of results")
  .option("--full", "Show full document content")
  .option("--json", "Output as JSON")
  .action(searchCommand);

// project management
const project = program.command("project").description("Manage tracked projects");

project
  .command("add [path]")
  .description("Add a project to cursormemory config (defaults to current directory)")
  .option("-n, --name <name>", "Project name (defaults to directory name)")
  .action(addProjectCommand);

project
  .command("remove <name>")
  .description("Remove a project from cursormemory config")
  .action(removeProjectCommand);

project.command("list").description("List configured projects").action(listProjectsCommand);

// config
const config = program.command("config").description("Manage cursormemory configuration");

config
  .command("set-api-key <key>")
  .description("Set CURSOR_API_KEY in config")
  .action(setApiKeyCommand);

config
  .command("show")
  .description("Show current configuration")
  .action(showConfigCommand);

// install cursor commands
program
  .command("install-commands")
  .description("Install Cursor IDE commands to ~/.cursor/commands/")
  .action(installCommandsAction);

// install cursor hooks
program
  .command("install-hooks")
  .description("Install Cursor hooks to auto-save conversations to ~/cursormemory")
  .action(installHooksCommand);

// status
program.command("status").description("Show cursormemory status").action(statusCommand);

// daemon
const daemon = program.command("daemon").description("Manage auto-distill background daemon");

daemon
  .command("start")
  .description("Start the auto-distill daemon")
  .option("-i, --interval <hours>", "Distill interval in hours")
  .action(daemonStartCommand);

daemon.command("stop").description("Stop the daemon").action(daemonStopCommand);

daemon.command("status").description("Show daemon status").action(daemonStatusCommand);

daemon
  .command("install")
  .description("Install as macOS launch agent (auto-start on login)")
  .action(daemonInstallCommand);

daemon
  .command("uninstall")
  .description("Remove the macOS launch agent")
  .action(daemonUninstallCommand);

// notify
const notify = program.command("notify").description("Manage Telegram notifications");

notify
  .command("setup")
  .description("Configure Telegram bot (auto-detects chat ID)")
  .requiredOption("-t, --token <token>", "Telegram bot token from @BotFather")
  .option("-c, --chat-id <chatId>", "Manually set chat ID (skips auto-detect)")
  .action(notifySetupCommand);

notify.command("test").description("Send a test message").action(notifyTestCommand);

notify
  .command("briefing")
  .description("Send a morning briefing based on current memories")
  .action(notifyBriefingCommand);

notify
  .command("send <message>")
  .description("Send a custom message via Telegram")
  .action(notifySendCommand);

// internal hook handler (hidden from help)
const hookCmd = new Command("_hook-save-memory").action(hookSaveMemory);
program.addCommand(hookCmd, { hidden: true });

program.parse();
