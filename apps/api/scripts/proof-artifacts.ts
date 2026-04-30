import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "../../..");
const proofsDir = path.join(repoRoot, "docs", "proofs");

export function getProofsDir() {
  return proofsDir;
}

export function getRepoRoot() {
  return repoRoot;
}

export function createProofTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function getGitCommit() {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8"
    }).trim();
  } catch {
    return null;
  }
}

export async function writeProofArtifact(prefix: string, payload: unknown, date = new Date()) {
  const timestamp = createProofTimestamp(date);
  await mkdir(proofsDir, { recursive: true });
  const filename = `${prefix}-${timestamp}.json`;
  const absolutePath = path.join(proofsDir, filename);
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return {
    filename,
    absolutePath,
    timestamp
  };
}
