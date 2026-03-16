"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadIcon,
  Signal,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export default function FileTransferPage() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferHash, setTransferHash] = useState("");
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"send" | "receive">("send");
  const [inputHash, setInputHash] = useState("");
  const [customFilename, setCustomFilename] = useState("");
  const [fileExtension, setFileExtension] = useState("jpg");
  const [copied, setCopied] = useState(false);

  const fileTypes = [
    "jpg", "jpeg", "png", "avif", "gif", "bmp", "webp",
    "txt", "pdf", "docx", "xlsx", "csv",
    "zip", "tar", "gz", "rar",
    "mp4", "mp3", "wav", "mkv", "mov",
  ];

  const handleSelectFile = async () => {
    const selected = await open({ multiple: false, filters: [] });
    if (typeof selected === "string") {
      setFilePath(selected);
    }
  };

  const handleTransfer = async () => {
    try {
      if (!filePath) return;
      setIsTransferring(true);
      setProgress(100);
      setTransferHash("");
      setQrSvg(null);

      const [ticket, svg] = (await invoke("send", {
        path: filePath,
      })) as [string, string];

      setTransferHash(ticket);
      setQrSvg(svg);

      // Decrease progress over 90 seconds
      const totalDuration = 90 * 1000;
      const intervalTime = 1000;
      const totalTicks = totalDuration / intervalTime;
      let ticks = 0;

      const interval = setInterval(() => {
        ticks++;
        const percentage = Math.max(0, 100 - (ticks / totalTicks) * 100);
        setProgress(percentage);

        if (percentage <= 0) {
          clearInterval(interval);
          setIsTransferring(false);
        }
      }, intervalTime);
    } catch (error) {
      setIsTransferring(false);
      setProgress(0);
    }
  };

  const handleReceive = async () => {
    try {
      if (!inputHash) return;
      if (!customFilename.trim()) return;
      if (!fileExtension) return;

      setIsTransferring(true);
      setProgress(0);

      const finalName = `${customFilename.trim()}.${fileExtension}`;

      await invoke("receive", {
        ticketString: inputHash,
        destinationPath: finalName,
      });

      setTimeout(() => {
        setProgress(100);
        setIsTransferring(false);
      }, 1500);
    } catch (error) {
      setIsTransferring(false);
    }
  };

  const copyHash = async () => {
    await navigator.clipboard.writeText(transferHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSendValid = filePath && !isTransferring;
  const isReceiveValid = inputHash && customFilename.trim() && fileExtension && !isTransferring;

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-zinc-900/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <BackButton />
        
        <Card className="bg-zinc-900 border border-zinc-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Signal className="w-5 h-5 text-cyan-500" />
                </div>
                <CardTitle className="text-xl text-white">File Transfer</CardTitle>
              </div>
              
              {!isTransferring && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMode(mode === "send" ? "receive" : "send");
                    // Reset states on mode switch
                    setFilePath(null);
                    setTransferHash("");
                    setQrSvg(null);
                    setInputHash("");
                    setCustomFilename("");
                    setProgress(0);
                  }}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  {mode === "send" ? "Receive" : "Send"}
                </Button>
              )}
            </div>
            <CardDescription className="text-zinc-400">
              {mode === "send" 
                ? "Share files instantly via QR code or link. No account needed." 
                : "Enter a transfer hash to receive files from someone nearby."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* SEND MODE */}
            {mode === "send" && (
              <>
                {/* File Picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <UploadIcon className="w-4 h-4 text-zinc-400" />
                    Select File to Send
                  </label>
                  <button
                    onClick={handleSelectFile}
                    className={`w-full flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-all duration-200 min-h-[160px]
                      ${filePath 
                        ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500/70" 
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                      }`}
                  >
                    <div className={`p-3 rounded-lg mb-3 ${filePath ? "bg-emerald-500/20" : "bg-zinc-700"}`}>
                      <UploadIcon className={`w-6 h-6 ${filePath ? "text-emerald-400" : "text-zinc-400"}`} />
                    </div>
                    <span className={`text-sm font-medium mb-1 ${filePath ? "text-white" : "text-zinc-400"}`}>
                      {filePath ? "File Selected" : "Click to choose a file"}
                    </span>
                    <p className="text-xs text-zinc-500 truncate max-w-[90%] text-center">
                      {filePath ? filePath.split(/[/\\]/).pop() : "Supports all common formats"}
                    </p>
                    {filePath && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-2" />}
                  </button>
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleTransfer}
                  disabled={!isSendValid}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 text-white 
                    font-semibold rounded-lg shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-500
                    transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Link...
                    </>
                  ) : (
                    <>
                      Start Transfer
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                {/* Transfer Info (shown after start) */}
                {(transferHash || qrSvg) && (
                  <div className="space-y-4 pt-2 border-t border-zinc-800">
                    {/* QR Code */}
                    {qrSvg && (
                      <div className="flex justify-center">
                        <div className="p-3 rounded-lg bg-white">
                          <div 
                            className="w-40 h-40"
                            dangerouslySetInnerHTML={{ __html: qrSvg }} 
                          />
                        </div>
                      </div>
                    )}

                    {/* Hash + Copy */}
                    {transferHash && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Transfer Link</label>
                        <div className="flex gap-2">
                          <Input
                            value={transferHash}
                            readOnly
                            className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copyHash}
                            className="border-zinc-700 hover:bg-zinc-800 shrink-0"
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    {isTransferring && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400 flex items-center gap-1.5">
                            <Signal className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                            Link active for:
                          </span>
                          <span className="text-zinc-300 font-mono">{Math.ceil(progress)}s</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-zinc-800" />
                      </div>
                    )}

                    {/* Complete State */}
                    {!isTransferring && progress <= 1 && (
                      <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 py-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Transfer link expired
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* RECEIVE MODE */}
            {mode === "receive" && (
              <div className="space-y-4">
                {/* Hash Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Transfer Hash</label>
                  <Input
                    placeholder="Enter the hash url"
                    value={inputHash}
                    onChange={(e) => setInputHash(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white font-mono uppercase tracking-wider"
                    maxLength={200}
                  />
                </div>

                {/* Filename + Extension */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Save As</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="filename"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                    />
                    <Select value={fileExtension} onValueChange={setFileExtension}>
                      <SelectTrigger className="w-24 bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white max-h-48">
                        {fileTypes.map((ext) => (
                          <SelectItem key={ext} value={ext} className="focus:bg-zinc-700 focus:text-white">
                            <span className="font-mono text-cyan-400">.{ext}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Receive Button */}
                <Button
                  onClick={handleReceive}
                  disabled={!isReceiveValid}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 text-white 
                    font-semibold rounded-lg shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-500
                    transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Receiving...
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4" />
                      Start Receive
                    </>
                  )}
                </Button>

                {/* Progress */}
                {(isTransferring || progress > 0) && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">
                        {progress >= 100 ? "Complete" : "Downloading..."}
                      </span>
                      <span className="text-zinc-300 font-mono">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-zinc-800" />
                  </div>
                )}

                {/* Complete State */}
                {progress >= 100 && !isTransferring && (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 py-2">
                    <CheckCircle2 className="w-4 h-4" />
                    File saved successfully
                  </div>
                )}
              </div>
            )}

            {/* Helper text */}
            <p className="text-xs text-zinc-500 text-center pt-2">
              Transfers are peer-to-peer • End-to-end encrypted • Auto-expire in 90s
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}