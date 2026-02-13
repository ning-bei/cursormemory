import { readFileSync, existsSync, unlinkSync } from "fs";
import { CURSORMEMORY_HOME, BRIEFING_PROMPT, BRIEFING_OUTPUT_PATH } from "../constants.js";
import { runCursorAgent, checkCursorCli } from "../cursor-cli.js";

const AGENT_TIMEOUT_MS = 5 * 60_000; // 5 minutes

export async function generateBriefing(): Promise<string> {
  if (!checkCursorCli()) {
    throw new Error("Cursor CLI (agent) not found");
  }

  // Clean up previous briefing
  if (existsSync(BRIEFING_OUTPUT_PATH)) {
    unlinkSync(BRIEFING_OUTPUT_PATH);
  }

  const prompt = BRIEFING_PROMPT + BRIEFING_OUTPUT_PATH;
  const result = await runCursorAgent(prompt, CURSORMEMORY_HOME, {
    timeoutMs: AGENT_TIMEOUT_MS,
  });

  if (result.exitCode !== 0) {
    const reason = result.exitCode === 124 ? "timed out" : `exit ${result.exitCode}`;
    throw new Error(`Agent failed (${reason}): ${result.output.slice(-200).trim()}`);
  }

  if (!existsSync(BRIEFING_OUTPUT_PATH)) {
    throw new Error("Agent did not produce a briefing file");
  }

  let briefing = readFileSync(BRIEFING_OUTPUT_PATH, "utf-8").trim();

  // Telegram message limit
  if (briefing.length > 4000) {
    briefing = briefing.slice(0, 3950) + "\n\n... (truncated)";
  }

  return briefing;
}
