// Guards against real environment files (secrets) being committed or shipped.
// It reads only variable NAMES and whether a value is empty; it never prints a value.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..", "..");
const SECRET_KEYS = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "COINGECKO_API_KEY", "REDIS_URL"];

function insideGit(): boolean {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("environment files and secrets", () => {
  const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim());

  it(".gitignore ignores real env files but keeps .env.example", () => {
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain(".env.*");
    expect(gitignore).toContain("!.env.example");
  });

  it(".gitignore ignores build output that could embed configuration", () => {
    expect(gitignore).toContain("dist/");
  });

  it(".env.example documents every secret key with an empty value", () => {
    const lines = readFileSync(resolve(root, ".env.example"), "utf8").split(/\r?\n/);
    for (const key of SECRET_KEYS) {
      const line = lines.find((entry) => entry.startsWith(`${key}=`));
      expect(line, `${key} should be listed in .env.example`).toBeDefined();
      expect(line?.slice(key.length + 1).trim(), `${key} must have no value in .env.example`).toBe("");
    }
  });

  it.skipIf(!insideGit())("Git does not track any real env file", () => {
    const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((file) => /(^|\/)\.env(\..+)?$/.test(file) && !file.endsWith(".env.example"));
    expect(tracked).toEqual([]);
  });
});
