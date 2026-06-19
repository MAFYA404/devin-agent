import Anthropic from "@anthropic-ai/sdk";

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "shell",
    description:
      "Execute a command in a bash shell. Returns the output and exit code. Use this for running commands, installing packages, git operations, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description: "The bash command to execute",
        },
        session_id: {
          type: "string",
          description:
            "Shell session ID. Use the same ID to maintain state between commands. Defaults to 'default'.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "read_file",
    description:
      "Read the contents of a file. Returns the full file content as a string.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the file to read",
        },
        start_line: {
          type: "number",
          description: "Optional start line (1-based)",
        },
        end_line: {
          type: "number",
          description: "Optional end line (1-based)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file, creating it if it doesn't exist or overwriting if it does.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the file to write",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Edit a file by replacing an old string with a new string. The old string must match exactly.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the file to edit",
        },
        old_string: {
          type: "string",
          description: "The exact string to find and replace",
        },
        new_string: {
          type: "string",
          description: "The string to replace old_string with",
        },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "list_directory",
    description:
      "List files and directories at the given path. Returns name, size, type, and modification date.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the directory to list",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description:
      "Search file contents using a regex pattern within a directory. Returns matching lines with file paths and line numbers.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Directory path to search in",
        },
        pattern: {
          type: "string",
          description: "Regex pattern to search for",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return (default: 50)",
        },
      },
      required: ["path", "pattern"],
    },
  },
  {
    name: "search_filenames",
    description:
      "Search for files by name pattern (glob) within a directory.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Directory path to search in",
        },
        glob: {
          type: "string",
          description:
            "Glob pattern(s) to match filenames. Separate multiple patterns with semicolons.",
        },
      },
      required: ["path", "glob"],
    },
  },
];
