"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, Mode } from "@/lib/types";

interface ToolCallDisplay {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<Mode>("standard");
  const [toolCalls, setToolCalls] = useState<Map<string, ToolCallDisplay>>(
    new Map()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolCalls, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    setToolCalls(new Map());

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      const currentToolCalls = new Map<string, ToolCallDisplay>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case "text":
              assistantContent += data.content;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.content = assistantContent;
                } else {
                  newMessages.push({
                    id: uuidv4(),
                    role: "assistant",
                    content: assistantContent,
                    timestamp: Date.now(),
                  });
                }
                return newMessages;
              });
              break;

            case "tool_calls":
              for (const call of data.calls) {
                currentToolCalls.set(call.id, {
                  id: call.id,
                  name: call.name,
                  input: call.input,
                });
              }
              setToolCalls(new Map(currentToolCalls));
              break;

            case "tool_result":
              if (currentToolCalls.has(data.callId)) {
                const tc = currentToolCalls.get(data.callId)!;
                tc.result = data.result;
                tc.isError = data.isError;
                currentToolCalls.set(data.callId, tc);
                setToolCalls(new Map(currentToolCalls));
              }
              break;

            case "error":
              setMessages((prev) => [
                ...prev,
                {
                  id: uuidv4(),
                  role: "assistant",
                  content: `Error: ${data.error}`,
                  timestamp: Date.now(),
                },
              ]);
              break;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          content: `Connection error: ${message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-300">Chat</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setMode(mode === "planning" ? "standard" : "planning")
            }
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              mode === "planning"
                ? "bg-amber-600/20 text-amber-400 border border-amber-600/40"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}
          >
            {mode === "planning" ? "Planning" : "Standard"}
          </button>
          <button
            onClick={() => {
              setMessages([]);
              setToolCalls(new Map());
            }}
            className="px-3 py-1 text-xs rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <div className="text-center">
              <div className="text-4xl mb-4">{"</>"}</div>
              <p className="text-lg font-medium">Devin Agent</p>
              <p className="text-sm mt-1">
                Your AI software engineering assistant
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600/20 text-blue-100 border border-blue-600/30"
                  : "bg-zinc-800/50 text-zinc-200 border border-zinc-700/50"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {toolCalls.size > 0 && (
          <div className="space-y-2">
            {Array.from(toolCalls.values()).map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {isProcessing && toolCalls.size === 0 && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/50 rounded-lg px-4 py-3 border border-zinc-700/50">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                </div>
                <span className="text-xs text-zinc-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-zinc-800 bg-zinc-900/50"
      >
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Devin to help you code..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            rows={2}
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ToolCallDisplay }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = (name: string) => {
    switch (name) {
      case "shell":
        return ">";
      case "read_file":
      case "write_file":
      case "edit_file":
        return "#";
      case "list_directory":
        return "+";
      case "search_files":
      case "search_filenames":
        return "?";
      default:
        return "*";
    }
  };

  return (
    <div className="border border-zinc-700/50 rounded-lg overflow-hidden bg-zinc-800/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-xs font-mono text-blue-400 w-5">
          {getToolIcon(toolCall.name)}
        </span>
        <span className="text-xs font-medium text-zinc-300">
          {toolCall.name}
        </span>
        {toolCall.name === "shell" && (
          <span className="text-xs text-zinc-500 font-mono truncate ml-1">
            {String(toolCall.input.command || "").slice(0, 60)}
          </span>
        )}
        {(toolCall.name === "read_file" || toolCall.name === "write_file") && (
          <span className="text-xs text-zinc-500 font-mono truncate ml-1">
            {String(toolCall.input.path || "")}
          </span>
        )}
        <span className="ml-auto">
          {toolCall.result === undefined ? (
            <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
          ) : toolCall.isError ? (
            <span className="text-xs text-red-400">err</span>
          ) : (
            <span className="text-xs text-green-400">ok</span>
          )}
        </span>
        <span className="text-zinc-600 text-xs">{isExpanded ? "-" : "+"}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-700/50 p-3 space-y-2">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Input:</p>
            <pre className="text-xs text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Output:</p>
              <pre
                className={`text-xs rounded p-2 overflow-x-auto max-h-60 overflow-y-auto ${
                  toolCall.isError
                    ? "text-red-400 bg-red-950/30"
                    : "text-green-300 bg-zinc-900"
                }`}
              >
                {toolCall.result.slice(0, 5000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
