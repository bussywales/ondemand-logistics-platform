import fs from "node:fs";
import path from "node:path";

type LoadEnvResult = {
  found: boolean;
  loadedKeys: string[];
  path: string;
};

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadEnvFileIfPresent(filePath: string): LoadEnvResult {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return { found: false, loadedKeys: [], path: absolutePath };
  }

  const loadedKeys: string[] = [];
  const content = fs.readFileSync(absolutePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    if (!process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
      loadedKeys.push(parsed.key);
    }
  }

  return {
    found: true,
    loadedKeys,
    path: absolutePath
  };
}
