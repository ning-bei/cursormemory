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

// internal hook handler (hidden from help)
const hookCmd = new Command("_hook-save-memory").action(hookSaveMemory);
program.addCommand(hookCmd, { hidden: true });

program.parse();
