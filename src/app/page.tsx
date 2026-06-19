"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import FileExplorer from "@/components/FileExplorer";
import FileEditor from "@/components/FileEditor";
import TerminalPanel from "@/components/TerminalPanel";

type Panel = "chat" | "editor" | "terminal";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [apiKeySet, setApiKeySet] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");

  const checkApiKey = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.configured) {
        setApiKeySet(true);
      } else {
        setApiKeySet(false);
      }
    } catch {
      setApiKeySet(false);
    }
  };

  if (apiKeySet === null) {
    checkApiKey();
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200">
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-400">{"</>"}</span>
          <h1 className="text-sm font-semibold">Devin Agent</h1>
          <span className="text-xs text-zinc-600">AI Software Engineer</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              sidebarOpen
                ? "bg-zinc-700 text-zinc-200"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              bottomPanelOpen
                ? "bg-zinc-700 text-zinc-200"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            Terminal
          </button>
          <div className="flex border border-zinc-700 rounded overflow-hidden ml-2">
            {(["chat", "editor"] as Panel[]).map((panel) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`px-3 py-1 text-xs capitalize transition-colors ${
                  activePanel === panel
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {panel}
              </button>
            ))}
          </div>
        </div>
      </header>

      {apiKeySet === false && (
        <div className="px-4 py-3 bg-amber-950/30 border-b border-amber-900/30 flex items-center gap-3">
          <span className="text-xs text-amber-400">
            Set your Anthropic API key:
          </span>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 max-w-md text-xs bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
          <button
            onClick={async () => {
              const res = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: apiKeyInput }),
              });
              if (res.ok) {
                setApiKeySet(true);
              }
            }}
            className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
          >
            Save
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="w-64 border-r border-zinc-800 overflow-hidden">
            <FileExplorer
              onFileSelect={(path) => {
                setSelectedFile(path);
                setActivePanel("editor");
              }}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className={`flex-1 overflow-hidden ${bottomPanelOpen ? "" : "h-full"}`}
          >
            {activePanel === "chat" && <ChatPanel />}
            {activePanel === "editor" && (
              <FileEditor
                filePath={selectedFile}
                onClose={() => {
                  setSelectedFile(null);
                  setActivePanel("chat");
                }}
              />
            )}
          </div>

          {bottomPanelOpen && (
            <div className="h-64 border-t border-zinc-800 overflow-hidden">
              <TerminalPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
