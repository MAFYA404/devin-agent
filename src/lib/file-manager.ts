import fs from "fs/promises";
import path from "path";

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

export async function createFile(
  filePath: string,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

export async function listDirectory(dirPath: string): Promise<FileInfo[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results: FileInfo[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env") continue;
    const fullPath = path.join(dirPath, entry.name);
    try {
      const stat = await fs.stat(fullPath);
      results.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      });
    } catch {
      continue;
    }
  }

  return results.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function searchFiles(
  dirPath: string,
  pattern: string,
  maxResults: number = 50
): Promise<{ file: string; line: number; content: string }[]> {
  const results: { file: string; line: number; content: string }[] = [];
  const regex = new RegExp(pattern, "gi");

  async function searchDir(dir: string) {
    if (results.length >= maxResults) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (entry.name.startsWith(".") || entry.name === "node_modules")
          continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await searchDir(fullPath);
        } else {
          try {
            const content = await fs.readFile(fullPath, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) return;
              if (regex.test(lines[i])) {
                results.push({
                  file: fullPath,
                  line: i + 1,
                  content: lines[i].trim(),
                });
              }
              regex.lastIndex = 0;
            }
          } catch {
            continue;
          }
        }
      }
    } catch {
      return;
    }
  }

  await searchDir(dirPath);
  return results;
}

export async function searchFilenames(
  dirPath: string,
  glob: string
): Promise<string[]> {
  const results: string[] = [];
  const patterns = glob.split(";").map((p) => p.trim());

  function matchesGlob(name: string, pattern: string): boolean {
    const regexStr = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${regexStr}$`, "i").test(name);
  }

  async function searchDir(dir: string) {
    if (results.length >= 100) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules")
          continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await searchDir(fullPath);
        } else {
          for (const pattern of patterns) {
            if (matchesGlob(entry.name, pattern)) {
              results.push(fullPath);
              break;
            }
          }
        }
      }
    } catch {
      return;
    }
  }

  await searchDir(dirPath);
  return results;
}
