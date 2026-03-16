"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderSearch,
  Loader2,
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Trash2,
  Tag,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { BackButton } from "@/components/back-button";
import { useRouter } from "next/navigation";
import { listen } from "@tauri-apps/api/event";
import { CategorizationPieChart } from "@/components/ui/piechart";

interface FileNode {
  path: string;
  name: string;
  size: number;
  is_dir: boolean;
  children?: FileNode[];
  category?: string;
}

export default function SmartOrganizerPage() {
  const [directoryPath, setDirectoryPath] = useState("");
  const [fileTreeData, setFileTreeData] = useState<FileNode[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [operationMode, setOperationMode] = useState<
    "categorization" | "semantic_search" | "junk_detection" | "rename" | null
  >(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });
  const router = useRouter();

  // Category styles for dark mode (solid colors, no gradients)
  const categoryStyles: Record<string, string> = {
    images: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
    videos: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    audio: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    documents: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    archives: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    others: "bg-zinc-700/50 text-zinc-300 border border-zinc-600",
  };

  const [chartData, setChartData] = useState<
    { category: string; count: number; fill: string }[]
  >([]);

  useEffect(() => {
    const unlisten = listen<number>("scan_progress", ({ payload }) => {
      setProgress(payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  type CategorizationResult = {
    categorized: FileNode[];
    data: Record<string, number>;
  };

  const handleSelectDirectory = async () => {
    const dir = await open({ multiple: false, directory: true });
    if (typeof dir === "string") {
      setDirectoryPath(dir);
      setStatus({ type: null, message: "" });
    }
  };

  const scanDirectory = async (path: string) => {
    if (!path) {
      setStatus({ type: "error", message: "Please select a directory first." });
      return;
    }
    
    setIsScanning(true);
    setProgress(0);
    setStatus({ type: null, message: "" });

    try {
      const tree = (await invoke("scan_directory", { path })) as FileNode[];
      setFileTree(tree);
      setFileTreeData(tree);
      setProgress(100);
      setStatus({ type: "success", message: `Scanned ${countFiles(tree)} files` });
    } catch (error) {
      setStatus({ type: "error", message: `Scan failed: ${error}` });
    } finally {
      setIsScanning(false);
    }
  };

  const countFiles = (nodes: FileNode[]): number => {
    return nodes.reduce((acc, node) => {
      if (node.is_dir && node.children) {
        return acc + countFiles(node.children);
      }
      return acc + 1;
    }, 0);
  };

  const handleRunOperation = async (
    mode: "categorization" | "junk_detection" | "rename",
  ) => {
    if (!directoryPath || !fileTreeData.length) {
      setStatus({ type: "error", message: "Please scan a directory first." });
      return;
    }
    
    setIsScanning(true);
    setProgress(0);
    setOperationMode(mode);
    setStatus({ type: null, message: "" });

    const operationMap: Record<string, string> = {
      categorization: "categorize_files",
      junk_detection: "detect_junk",
      rename: "dry_run_rename",
    };

    try {
      let updatedTree = fileTreeData;
      
      if (mode === "categorization") {
        const result = await invoke<CategorizationResult>(operationMap[mode], {
          nodes: fileTreeData,
        });
        updatedTree = result.categorized;
        setFileTree(updatedTree);

        const chartData = Object.entries(result.data).map(
          ([category, count], i) => ({
            category,
            count,
            fill: `hsl(${260 + i * 30}, 70%, 60%)`, // Violet spectrum for consistency
          }),
        );
        setChartData(chartData);
        setStatus({ type: "success", message: `Categorized ${Object.values(result.data).reduce((a, b) => a + b, 0)} files` });
        
      } else if (mode === "junk_detection") {
        const result = await invoke<FileNode[]>(operationMap[mode], {
          nodes: fileTreeData,
        });
        updatedTree = result;
        setFileTree(updatedTree);
        const junkCount = countFiles(updatedTree) - countFiles(fileTreeData);
        setStatus({ type: "success", message: `Found ${Math.abs(junkCount)} potential junk files` });
      }

      setProgress(100);
    } catch (error) {
      setStatus({ type: "error", message: `Operation failed: ${error}` });
    } finally {
      setIsScanning(false);
      setOperationMode(null);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      const isFolder = !!node.children;
      const isExpanded = expandedPaths.has(node.path);
      
      return (
        <li key={node.path} className="mb-0.5">
          <div
            className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors
              ${isFolder ? "hover:bg-zinc-800/50" : "hover:bg-zinc-800/30"}`}
            style={{ paddingLeft: depth * 16 }}
            onClick={() => isFolder && toggleExpand(node.path)}
          >
            {/* Expand/Collapse Icon */}
            {isFolder && (
              <span className="w-4 h-4 flex items-center justify-center text-zinc-500">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            )}
            {!isFolder && <span className="w-4" />}
            
            {/* File/Folder Icon */}
            {isFolder ? (
              <Folder className="w-4 h-4 text-violet-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
            
            {/* Name + Category Badge */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-sm text-zinc-200 truncate">{node.name}</span>
              {node.category && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${categoryStyles[node.category]}`}>
                  {node.category}
                </span>
              )}
            </div>
            
            {/* Size (for files) */}
            {!isFolder && node.size > 0 && (
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                {formatSize(node.size)}
              </span>
            )}
          </div>
          
          {isExpanded && node.children && (
            <ul className="ml-2 border-l border-zinc-800 pl-2">
              {renderTree(node.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });

  function flattenFileTree(node: FileNode): FileNode[] {
    const children = node.children ?? [];
    return [node, ...children.flatMap(flattenFileTree)];
  }

  function formatSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  const totalFiles = fileTree.flatMap(flattenFileTree).filter((f) => !f.is_dir).length;
  const totalSize = fileTree.flatMap(flattenFileTree).filter((f) => !f.is_dir).reduce((acc, f) => acc + f.size, 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-zinc-900/50 pointer-events-none" />

      {/* Collapsible Sidebar */}
      <aside 
        className={`relative border-r border-zinc-800 bg-zinc-900/80 backdrop-blur-sm transition-all duration-300 ease-out
          ${showSidebar ? "w-72" : "w-0 overflow-hidden"}`}
      >
        {showSidebar && (
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Folder className="w-4 h-4 text-violet-400" />
                File Tree
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(false)}
                className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Category Legend */}
            <div className="mb-3 px-1">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Categories</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(categoryStyles).map(([cat, cls]) => (
                  <span key={cat} className={`text-[10px] px-1.5 py-0.5 rounded ${cls}`}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Tree View */}
            <ScrollArea className="flex-1 pr-2">
              {fileTree.length > 0 ? (
                <ul className="text-sm space-y-0.5">{renderTree(fileTree)}</ul>
              ) : (
                <p className="text-xs text-zinc-500 text-center py-8">
                  Scan a directory to view files
                </p>
              )}
            </ScrollArea>
          </div>
        )}
      </aside>

      {/* Sidebar Toggle (when collapsed) */}
      {!showSidebar && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(true)}
          className="absolute left-3 top-4 z-20 h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </Button>
      )}

      <BackButton position="right" />
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 backdrop-blur-sm shadow-xl">
          
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Sparkles className="w-5 h-5 text-violet-500" />
              </div>
              <CardTitle className="text-xl text-white">Smart Organizer</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              AI-powered file analysis: auto-categorize, detect junk, and organize your files intelligently.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Directory Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Directory to Analyze</label>
              <div className="flex gap-2">
                <Input
                  value={directoryPath}
                  placeholder="/path/to/folder"
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                />
                <Button 
                  onClick={handleSelectDirectory} 
                  variant="outline"
                  className="border-zinc-700 hover:bg-zinc-800 shrink-0"
                >
                  <FolderSearch className="w-4 h-4 mr-1.5" /> Browse
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => scanDirectory(directoryPath)}
                disabled={isScanning || !directoryPath}
                className="bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-lg shadow-md
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-500
                  transition-all duration-200 flex items-center gap-2"
              >
                {isScanning && !operationMode ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
                ) : (
                  <><FolderSearch className="w-4 h-4" /> Scan Directory</>
                )}
              </Button>

              <Button
                onClick={() => handleRunOperation("categorization")}
                disabled={isScanning || !fileTreeData.length}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
              >
                <Tag className="w-4 h-4" /> Categorize
              </Button>

              <Button
                onClick={() => handleRunOperation("junk_detection")}
                disabled={isScanning || !fileTreeData.length}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Junk Detection
              </Button>
            </div>

            {/* Progress Bar */}
            {isScanning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    {operationMode === "categorization" ? "Categorizing..." : 
                     operationMode === "junk_detection" ? "Analyzing..." : "Scanning..."}
                  </span>
                  <span className="text-zinc-300 font-mono">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-zinc-800" />
              </div>
            )}

            {/* Stats */}
            {fileTree.length > 0 && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div>
                  <span className="text-xs text-zinc-500">Total Files</span>
                  <p className="text-lg font-semibold text-white">{totalFiles.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500">Total Size</span>
                  <p className="text-lg font-semibold text-white">{formatSize(totalSize)}</p>
                </div>
              </div>
            )}

            {/* Pie Chart */}
            {chartData.length > 0 && (
              <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700">
                <h4 className="text-sm font-medium text-zinc-300 mb-3">Category Distribution</h4>
                <div className="flex justify-center">
                  <CategorizationPieChart data={chartData} />
                </div>
              </div>
            )}

            {/* Status Message */}
            {status.type && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                status.type === "success" 
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" 
                  : "bg-red-500/10 border border-red-500/30 text-red-300"
              }`}>
                {status.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <span className="w-4 h-4 shrink-0">⚠️</span>
                )}
                {status.message}
              </div>
            )}

            {/* Helper text */}
            <p className="text-xs text-zinc-500 text-center pt-2">
              All analysis runs locally • No files uploaded • Privacy-first design
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}