import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

describe("migration files", () => {
  it("exist and are numerically ordered", () => {
    const migrationsDir = join(process.cwd(), "migrations");
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files[0]).toBe("0001_foundations_schema.sql");
    expect(files[1]).toBe("0002_rls_policies.sql");
    expect(files[2]).toBe("0003_rls_recursion_fix.sql");
  });
});
