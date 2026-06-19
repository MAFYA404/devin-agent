"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface HistoryEntry {
  command: string;
  output: string;
  exitCode: number | null;
  timestamp: number;
}

export default function TerminalPanel() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    setIsRunning(true);
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    try {
      const res = await fetch("/api/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });

      const data = await res.json();

      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: data.output || data.error || "",
          exitCode: data.exitCode ?? null,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: `Error: ${err instanceof Error ? err.message : String(err)}`,
          exitCode: 1,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsRunning(false);
      setCommand("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(command);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-300">Terminal</h2>
        <button
          onClick={() => setHistory([])}
          className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
        >
          Clear
        </button>
      </div>

      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-2"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((entry, idx) => (
          <div key={idx}>
            <div className="flex items-center gap-1 text-green-400">
              <span className="text-blue-400">$</span>
              <span>{entry.command}</span>
            </div>
            {entry.output && (
              <pre className="text-zinc-400 whitespace-pre-wrap mt-1 pl-3">
                {entry.output}
              </pre>
            )}
            {entry.exitCode !== null && entry.exitCode !== 0 && (
              <span className="text-red-400 text-[10px]">
                exit code: {entry.exitCode}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-2 flex items-center gap-2">
        <span className="text-green-400 text-xs font-mono">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 bg-transparent text-zinc-200 font-mono text-xs focus:outline-none placeholder-zinc-600"
          disabled={isRunning}
          autoFocus
        />
        {isRunning && (
          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
