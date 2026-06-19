export type Role = "user" | "assistant";
export type Mode = "planning" | "standard";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultMessage {
  toolCallId: string;
  name: string;
  result: string;
  isError: boolean;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResultMessage[];
  timestamp: number;
  isThinking?: boolean;
}

export interface ConversationState {
  messages: ChatMessage[];
  mode: Mode;
  isProcessing: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
}
