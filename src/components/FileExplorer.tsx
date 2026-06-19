"use client";

import { useState, useEffect, useTransition } from "react";
import type { FileInfo } from "@/lib/file-manager";

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  rootPath?: string;
}

interface TreeNode extends FileInfo {
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

async function fetchDirectory(dirPath: string): Promise<TreeNode[]> {
  const res = await fetch(
    `/api/files?path=${encodeURIComponent(dirPath)}&action=list`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.entries || []).map((e: FileInfo) => ({
    ...e,
    isExpanded: false,
  }));
}

export default function FileExplorer({
  onFileSelect,
  rootPath = "/home/ubuntu",
}: FileExplorerProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [isPending, startTransition] = useTransition();
  const [loadToken, setLoadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nodes = await fetchDirectory(currentPath);
        if (!cancelled) setTree(nodes);
      } catch {
        if (!cancelled) setTree([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentPath, loadToken]);

  const refreshDir = () => {
    setLoadToken((t) => t + 1);
  };

  const navigateTo = (path: string) => {
    startTransition(() => {
      setCurrentPath(path);
    });
  };

  const toggleDir = async (node: TreeNode, path: number[]) => {
    const newTree = [...tree];
    let current = newTree;
    let target: TreeNode | undefined;

    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        target = current[path[i]];
      } else {
        current = current[path[i]].children || [];
      }
    }

    if (!target) return;

    if (target.isExpanded) {
      target.isExpanded = false;
      target.children = undefined;
    } else {
      target.isLoading = true;
      setTree([...newTree]);
      try {
        const children = await fetchDirectory(target.path);
        target.children = children;
        target.isExpanded = true;
      } catch {
        target.children = [];
      }
      target.isLoading = false;
    }

    setTree([...newTree]);
  };

  const getFileIcon = (name: string, isDir: boolean) => {
    if (isDir) return "\u{1F4C1}";
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "TS";
      case "js":
      case "jsx":
        return "JS";
      case "json":
        return "{}";
      case "md":
        return "MD";
      case "css":
        return "CS";
      case "html":
        return "<>";
      case "py":
        return "PY";
      default:
        return "\u{1F4C4}";
    }
  };

  const renderNode = (
    node: TreeNode,
    index: number,
    depth: number,
    path: number[]
  ) => (
    <div key={node.path}>
      <button
        onClick={() => {
          if (node.isDirectory) {
            toggleDir(node, [...path, index]);
          } else {
            onFileSelect(node.path);
          }
        }}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-left hover:bg-zinc-800 rounded text-xs transition-colors group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.isDirectory && (
          <span className="text-zinc-500 w-3 text-center text-[10px]">
            {node.isLoading ? "..." : node.isExpanded ? "v" : ">"}
          </span>
        )}
        <span className="text-[10px] w-5 text-center shrink-0 text-zinc-500">
          {getFileIcon(node.name, node.isDirectory)}
        </span>
        <span className="truncate text-zinc-300 group-hover:text-zinc-100">
          {node.name}
        </span>
        {!node.isDirectory && (
          <span className="ml-auto text-[10px] text-zinc-600">
            {formatSize(node.size)}
          </span>
        )}
      </button>
      {node.isExpanded &&
        node.children?.map((child, i) =>
          renderNode(child, i, depth + 1, [...path, index])
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-300">Files</h2>
        <button
          onClick={refreshDir}
          className="ml-auto px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="px-2 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const parent =
                currentPath.split("/").slice(0, -1).join("/") || "/";
              navigateTo(parent);
            }}
            className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            disabled={currentPath === "/"}
          >
            ..
          </button>
          <input
            type="text"
            defaultValue={currentPath}
            key={currentPath}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigateTo(e.currentTarget.value);
              }
            }}
            className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isPending ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">
            Loading...
          </div>
        ) : tree.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">
            Empty directory
          </div>
        ) : (
          tree.map((node, i) => renderNode(node, i, 0, []))
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
