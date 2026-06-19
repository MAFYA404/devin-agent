import shellManager from "./shell-manager";
import {
  readFile,
  writeFile,
  listDirectory,
  searchFiles,
  searchFilenames,
} from "./file-manager";

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "shell":
        return await executeShell(input);
      case "read_file":
        return await executeReadFile(input);
      case "write_file":
        return await executeWriteFile(input);
      case "edit_file":
        return await executeEditFile(input);
      case "list_directory":
        return await executeListDirectory(input);
      case "search_files":
        return await executeSearchFiles(input);
      case "search_filenames":
        return await executeSearchFilenames(input);
      default:
        return { success: false, output: "", error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: message };
  }
}

async function executeShell(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const command = input.command as string;
  const sessionId = (input.session_id as string) || "default";

  shellManager.createSession(sessionId);
  const result = await shellManager.executeCommand(sessionId, command);

  return {
    success: result.exitCode === 0,
    output: result.output,
    error:
      result.exitCode !== 0
        ? `Command exited with code ${result.exitCode}`
        : undefined,
  };
}

async function executeReadFile(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const filePath = input.path as string;
  const startLine = input.start_line as number | undefined;
  const endLine = input.end_line as number | undefined;

  let content = await readFile(filePath);

  if (startLine || endLine) {
    const lines = content.split("\n");
    const start = (startLine || 1) - 1;
    const end = endLine || lines.length;
    content = lines.slice(start, end).join("\n");
  }

  return { success: true, output: content };
}

async function executeWriteFile(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const filePath = input.path as string;
  const content = input.content as string;

  await writeFile(filePath, content);
  return { success: true, output: `File written: ${filePath}` };
}

async function executeEditFile(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const filePath = input.path as string;
  const oldString = input.old_string as string;
  const newString = input.new_string as string;

  const content = await readFile(filePath);
  if (!content.includes(oldString)) {
    return {
      success: false,
      output: "",
      error: "old_string not found in file",
    };
  }

  const newContent = content.replace(oldString, newString);
  await writeFile(filePath, newContent);
  return { success: true, output: `File edited: ${filePath}` };
}

async function executeListDirectory(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const dirPath = input.path as string;
  const entries = await listDirectory(dirPath);
  return { success: true, output: JSON.stringify(entries, null, 2) };
}

async function executeSearchFiles(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const dirPath = input.path as string;
  const pattern = input.pattern as string;
  const maxResults = (input.max_results as number) || 50;

  const results = await searchFiles(dirPath, pattern, maxResults);
  return { success: true, output: JSON.stringify(results, null, 2) };
}

async function executeSearchFilenames(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const dirPath = input.path as string;
  const glob = input.glob as string;

  const results = await searchFilenames(dirPath, glob);
  return { success: true, output: results.join("\n") };
}
