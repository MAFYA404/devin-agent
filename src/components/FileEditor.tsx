"use client";

import { useState, useEffect } from "react";

interface FileEditorProps {
  filePath: string | null;
  onClose: () => void;
}

export default function FileEditor({ filePath, onClose }: FileEditorProps) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const isLoading = filePath !== null && filePath !== loadedPath && !error;

  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/files?path=${encodeURIComponent(filePath)}&action=read`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setContent(data.content);
        setOriginalContent(data.content);
        setIsDirty(false);
        setLoadedPath(filePath);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load file");
        setLoadedPath(filePath);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  const saveFile = async () => {
    if (!filePath) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOriginalContent(content);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  const getLanguage = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "TypeScript";
      case "js":
      case "jsx":
        return "JavaScript";
      case "py":
        return "Python";
      case "json":
        return "JSON";
      case "css":
        return "CSS";
      case "html":
        return "HTML";
      case "md":
        return "Markdown";
      case "sh":
      case "bash":
        return "Shell";
      default:
        return "Plain Text";
    }
  };

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600">
        <div className="text-center">
          <p className="text-sm">Select a file to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-zinc-400 truncate">
            {filePath}
          </span>
          {isDirty && (
            <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
          )}
          <span className="text-[10px] text-zinc-600 shrink-0">
            {getLanguage(filePath)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={saveFile}
            disabled={!isDirty || isSaving}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            x
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-950/30 text-red-400 text-xs border-b border-red-900/30">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center flex-1 text-zinc-600 text-sm">
          Loading...
        </div>
      ) : (
        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsDirty(e.target.value !== originalContent);
            }}
            onKeyDown={(e) => {
              if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveFile();
              }
              if (e.key === "Tab") {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const newVal =
                  content.substring(0, start) + "  " + content.substring(end);
                setContent(newVal);
                setIsDirty(newVal !== originalContent);
                setTimeout(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                }, 0);
              }
            }}
            className="w-full h-full bg-zinc-950 text-zinc-200 font-mono text-sm p-4 focus:outline-none resize-none leading-6"
            spellCheck={false}
          />
          <div className="absolute bottom-2 right-4 text-[10px] text-zinc-600">
            {content.split("\n").length} lines
          </div>
        </div>
      )}
    </div>
  );
}
