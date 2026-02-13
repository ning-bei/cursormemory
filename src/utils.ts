import { execFileSync } from "child_process";

export function checkQmd(): boolean {
  try {
    execFileSync("which", ["qmd"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
