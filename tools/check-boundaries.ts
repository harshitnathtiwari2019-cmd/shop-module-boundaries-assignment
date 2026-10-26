import fs from "node:fs";
import path from "node:path";

export interface Violation {
  file: string;
  importPath: string;
  reason: string;
}

export function findViolations(root: string): Violation[] {
  const modulesDir = path.join(root, "src", "modules");
  const violations: Violation[] = [];

  if (!fs.existsSync(modulesDir)) {
    return violations;
  }

  function walk(directory: string): void {
    const entries = fs.readdirSync(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".ts")) {
        continue;
      }

      const source = fs.readFileSync(fullPath, "utf8");

      const file = path.relative(root, fullPath).split(path.sep).join("/");

      const relativeModulePath = path.relative(
        modulesDir,
        path.dirname(fullPath),
      );

      const currentModule = relativeModulePath.split(path.sep)[0];

      const importRegex =
        /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

      for (const match of source.matchAll(importRegex)) {
        const importPath: string | undefined = match[1] ?? match[2];

        if (!importPath) {
          continue;
        }

        if (!importPath.startsWith(".")) {
          continue;
        }

        const resolvedPath = path.resolve(path.dirname(fullPath), importPath);

        const relativeTarget = path.relative(modulesDir, resolvedPath);

        const targetParts = relativeTarget.split(path.sep);
        const targetModule = targetParts[0];

        if (
          !targetModule ||
          targetModule === ".." ||
          path.isAbsolute(relativeTarget)
        ) {
          continue;
        }

        // Allow imports from the current module.
        if (targetModule === currentModule) {
          continue;
        }

        // Allow imports directly under src/platform.
        if (targetParts.length === 1 && targetModule === "platform") {
          continue;
        }

        // Allow another module's public index.ts only.
        if (targetParts.length === 2 && targetParts[1] === "index.ts") {
          continue;
        }

        violations.push({
          file,
          importPath,
          reason:
            "A module may import only its own files, platform files, or another module's index.ts",
        });
      }
    }
  }

  walk(modulesDir);

  return violations;
}
