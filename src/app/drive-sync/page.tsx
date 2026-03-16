"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadIcon, Loader2, ArrowRightLeft, CheckCircle2, HardDrive, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { BackButton } from "@/components/back-button";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Progress } from "@/components/ui/progress";

export default function DriveSyncPage() {
  const [localPath, setLocalPath] = useState("");
  const [drivePath, setDrivePath] = useState("");
  const [progress, setProgress] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState<"to-drive" | "to-local" | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  const handleSelectLocal = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setLocalPath(selected);
      setStatus({ type: null, message: "" });
    }
  };

  const handleSelectDrive = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setDrivePath(selected);
      setStatus({ type: null, message: "" });
    }
  };

  useEffect(() => {
    const unlisten = listen<number>("sync_progress", (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleSyncToDrive = async () => {
    if (!localPath || !drivePath) return;
    
    setSyncing(true);
    setSyncDirection("to-drive");
    setStatus({ type: null, message: "" });
    
    try {
      await invoke("sync", { localPath, drivePath });
      setStatus({ type: "success", message: "Synced to drive successfully!" });
    } catch (e) {
      setStatus({ type: "error", message: `Sync failed: ${e}` });
    } finally {
      setSyncing(false);
      setSyncDirection(null);
    }
  };

  const handleSyncToLocal = async () => {
    if (!localPath || !drivePath) return;
    
    setSyncing(true);
    setSyncDirection("to-local");
    setStatus({ type: null, message: "" });
    
    try {
      await invoke("sync", { drivePath, localPath });
      setStatus({ type: "success", message: "Synced to local successfully!" });
    } catch (e) {
      setStatus({ type: "error", message: `Sync failed: ${e}` });
    } finally {
      setSyncing(false);
      setSyncDirection(null);
    }
  };

  const isFormValid = localPath && drivePath && !syncing;

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-zinc-900/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl">
        <BackButton />
        
        <Card className="bg-zinc-900 border border-zinc-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
              </div>
              <CardTitle className="text-xl text-white">Drive Sync</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Keep your local and cloud folders in sync. Bidirectional sync with progress tracking.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Folder Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Folder */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-zinc-400" />
                  Local Folder
                </label>
                <button
                  onClick={handleSelectLocal}
                  className={`w-full flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-all duration-200 min-h-[180px]
                    ${localPath 
                      ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500/70" 
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                    }`}
                >
                  <div className={`p-3 rounded-lg mb-3 ${localPath ? "bg-emerald-500/20" : "bg-zinc-700"}`}>
                    <HardDrive className={`w-6 h-6 ${localPath ? "text-emerald-400" : "text-zinc-400"}`} />
                  </div>
                  <span className={`text-sm font-medium mb-1 ${localPath ? "text-white" : "text-zinc-400"}`}>
                    {localPath ? "Folder Selected" : "Select Local Folder"}
                  </span>
                  <p className="text-xs text-zinc-500 truncate max-w-[90%] text-center">
                    {localPath ? localPath.split(/[/\\]/).pop() : "Click to browse"}
                  </p>
                  {localPath && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-2" />}
                </button>
              </div>

              {/* Drive Folder */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <UploadIcon className="w-4 h-4 text-zinc-400" />
                  Drive Folder
                </label>
                <button
                  onClick={handleSelectDrive}
                  className={`w-full flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-all duration-200 min-h-[180px]
                    ${drivePath 
                      ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500/70" 
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                    }`}
                >
                  <div className={`p-3 rounded-lg mb-3 ${drivePath ? "bg-emerald-500/20" : "bg-zinc-700"}`}>
                    <UploadIcon className={`w-6 h-6 ${drivePath ? "text-emerald-400" : "text-zinc-400"}`} />
                  </div>
                  <span className={`text-sm font-medium mb-1 ${drivePath ? "text-white" : "text-zinc-400"}`}>
                    {drivePath ? "Folder Selected" : "Select Drive Folder"}
                  </span>
                  <p className="text-xs text-zinc-500 truncate max-w-[90%] text-center">
                    {drivePath ? drivePath.split(/[/\\]/).pop() : "Click to browse"}
                  </p>
                  {drivePath && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-2" />}
                </button>
              </div>
            </div>

            {/* Sync Direction Indicator */}
            {localPath && drivePath && (
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex-1 h-px bg-zinc-700" />
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <span className="text-zinc-500">Local</span>
                  <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                  <span className="text-zinc-500">Drive</span>
                </div>
                <div className="flex-1 h-px bg-zinc-700" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSyncToDrive}
                disabled={!isFormValid}
                className="flex-1 h-12 bg-blue-500 hover:bg-blue-400 text-white 
                  font-semibold rounded-lg shadow-md
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500
                  transition-all duration-200 flex items-center justify-center gap-2"
              >
                {syncing && syncDirection === "to-drive" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    Sync to Drive
                    <ArrowRightLeft className="w-4 h-4" />
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleSyncToLocal}
                disabled={!isFormValid}
                className="flex-1 h-12 bg-zinc-700 hover:bg-zinc-600 text-white 
                  font-semibold rounded-lg shadow-md
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-700
                  transition-all duration-200 flex items-center justify-center gap-2"
              >
                {syncing && syncDirection === "to-local" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    Sync to Local
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {syncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Sync in progress...</span>
                  <span className="text-zinc-300 font-mono">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-zinc-800"  />
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
              Sync is bidirectional • Changes are tracked • No data loss
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}