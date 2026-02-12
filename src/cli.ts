#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { syncCommand } from "./commands/sync.js";
import { distillCommand } from "./commands/distill.js";
import { indexCommand } from "./commands/index-cmd.js";
import { addProjectCommand, removeProjectCommand, listProjectsCommand } from "./commands/add-project.js";
import { addDocCommand, removeDocCommand, listDocsCommand } from "./commands/add-doc.js";
import { searchCommand } from "./commands/search.js";
import { statusCommand } from "./commands/status.js";
import { setApiKeyCommand, showConfigCommand } from "./commands/config-cmd.js";

const program = new Command();

program
  .name("openmemory")
  .description("A CLI tool for building a persistent memory system across projects and documents")
  .version("0.1.0");

// init
program
  .command("init")
  .description("Initialize openmemory in the current project (creates MEMORY.md, memory/, AGENTS.md)")
  .option("-n, --name <name>", "Project name (defaults to directory name)")
  .action(initCommand);

// sync
program
  .command("sync")
  .description("Sync project memories and cloud documents to ~/openmemory")
  .option("--projects", "Only sync projects")
  .option("--docs", "Only sync cloud documents")
  .action(syncCommand);

// distill
program
  .command("distill")
  .description("Distill recent memories into ~/openmemory/MEMORY.md using Cursor agent")
  .action(distillCommand);

// index
program
  .command("index")
  .description("Index ~/openmemory with qmd for search")
  .option("-f, --force", "Force re-embed all documents")
  .action(indexCommand);

// search
program
  .command("search <query>")
  .description("Search openmemory using qmd")
  .option("-m, --mode <mode>", "Search mode: search, vsearch, query", "search")
  .option("-n, --num <count>", "Number of results")
  .option("--full", "Show full document content")
  .option("--json", "Output as JSON")
  .action(searchCommand);

// project management
const project = program.command("project").description("Manage tracked projects");

project
  .command("add [path]")
  .description("Add a project to openmemory config (defaults to current directory)")
  .option("-n, --name <name>", "Project name (defaults to directory name)")
  .action(addProjectCommand);

project
  .command("remove <name>")
  .description("Remove a project from openmemory config")
  .action(removeProjectCommand);

project.command("list").description("List configured projects").action(listProjectsCommand);

// document management
const doc = program.command("doc").description("Manage cloud documents");

doc
  .command("add <url>")
  .description("Add a cloud document to fetch during sync")
  .requiredOption("--name <name>", "Document name")
  .option("--mcp <server>", "MCP server to use for fetching")
  .action(addDocCommand);

doc
  .command("remove <name>")
  .description("Remove a cloud document from config")
  .action(removeDocCommand);

doc.command("list").description("List configured documents").action(listDocsCommand);

// config
const config = program.command("config").description("Manage openmemory configuration");

config
  .command("set-api-key <key>")
  .description("Set CURSOR_API_KEY in config")
  .action(setApiKeyCommand);

config
  .command("show")
  .description("Show current configuration")
  .action(showConfigCommand);

// status
program.command("status").description("Show openmemory status").action(statusCommand);

program.parse();
