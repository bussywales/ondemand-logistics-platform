import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvFileIfPresent } from "./env-loader.js";

const touchedKeys = ["SMOKE_API_BASE_URL", "SMOKE_BUSINESS_BEARER_TOKEN"];

afterEach(() => {
  for (const key of touchedKeys) {
    delete process.env[key];
  }
});

describe("loadEnvFileIfPresent", () => {
  it("loads env keys from a present file", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shipwright-env-loader-"));
    const envPath = path.join(tempDir, ".env.smoke");
    fs.writeFileSync(
      envPath,
      "SMOKE_API_BASE_URL=https://api-staging-qvmv.onrender.com\nSMOKE_BUSINESS_BEARER_TOKEN=token-1\n"
    );

    const result = loadEnvFileIfPresent(envPath);

    expect(result.found).toBe(true);
    expect(result.loadedKeys).toEqual(["SMOKE_API_BASE_URL", "SMOKE_BUSINESS_BEARER_TOKEN"]);
    expect(process.env.SMOKE_API_BASE_URL).toBe("https://api-staging-qvmv.onrender.com");
    expect(process.env.SMOKE_BUSINESS_BEARER_TOKEN).toBe("token-1");
  });

  it("does not overwrite already exported env values", () => {
    process.env.SMOKE_API_BASE_URL = "https://already-set.example.com";

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shipwright-env-loader-"));
    const envPath = path.join(tempDir, ".env.smoke");
    fs.writeFileSync(envPath, "SMOKE_API_BASE_URL=https://api-staging-qvmv.onrender.com\n");

    const result = loadEnvFileIfPresent(envPath);

    expect(result.found).toBe(true);
    expect(result.loadedKeys).toEqual([]);
    expect(process.env.SMOKE_API_BASE_URL).toBe("https://already-set.example.com");
  });

  it("returns found false when the file does not exist", () => {
    const result = loadEnvFileIfPresent(path.join(os.tmpdir(), "shipwright-missing.env"));
    expect(result.found).toBe(false);
    expect(result.loadedKeys).toEqual([]);
  });
});
