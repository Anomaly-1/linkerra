"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen, File, Upload, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { BackButton } from "@/components/back-button";

export default function ConvertPage() {
  const [inputPath, setInputPath] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  const handleSelectFile = async () => {
    const selected = await open({ multiple: false });
    if (typeof selected === "string") {
      setInputPath(selected);
      setStatus({ type: null, message: "" });
    }
  };

  const handleSelectDir = async () => {
    const selected = await open({ directory: true });
    if (typeof selected === "string") {
      setOutputDir(selected);
      setStatus({ type: null, message: "" });
    }
  };

  const handleConvert = async () => {
    if (!inputPath || !outputFormat || !outputDir) {
      setStatus({ type: "error", message: "Please fill all fields." });
      return;
    }

    setIsConverting(true);
    setStatus({ type: null, message: "" });

    try {
      await invoke("convert_file", {
        inputPath,
        outputDir,
        outputFormat,
      });
      setStatus({ type: "success", message: "File converted successfully!" });
    } catch (e) {
      setStatus({ type: "error", message: `Conversion failed: ${e}` });
    } finally {
      setIsConverting(false);
    }
  };

  const isFormValid = inputPath && outputFormat && outputDir && !isConverting;

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-zinc-900/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        <BackButton />
        
        <Card className="bg-zinc-900 border border-zinc-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <File className="w-5 h-5 text-amber-500" />
              </div>
              <CardTitle className="text-xl text-white">File Converter</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Convert files between formats instantly. All processing happens locally on your device.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Input File */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-zinc-300">Input File</Label>
              <button
                onClick={handleSelectFile}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200
                  ${inputPath 
                    ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500/70" 
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-md ${inputPath ? "bg-emerald-500/20" : "bg-zinc-700"}`}>
                    <Upload className={`w-4 h-4 ${inputPath ? "text-emerald-400" : "text-zinc-400"}`} />
                  </div>
                  <span className={`text-sm truncate ${inputPath ? "text-white font-medium" : "text-zinc-400"}`}>
                    {inputPath ? inputPath.split(/[/\\]/).pop() : "Click to select a file"}
                  </span>
                </div>
                {inputPath && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-zinc-300">Output Format</Label>
              <Select onValueChange={(val) => { setOutputFormat(val); setStatus({ type: null, message: "" }); }}>
                <SelectTrigger className={`w-full bg-zinc-800 border-zinc-700 text-white focus:ring-2 focus:ring-amber-500/30 ${!outputFormat && "text-zinc-500"}`}>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {[
                    { ext: "pdf", label: "PDF Document" },
                    { ext: "png", label: "PNG Image" },
                    { ext: "jpg", label: "JPEG Image" },
                    { ext: "txt", label: "Plain Text" },
                    { ext: "mp4", label: "MP4 Video" },
                    { ext: "mp3", label: "MP3 Audio" },
                  ].map((fmt) => (
                    <SelectItem key={fmt.ext} value={fmt.ext} className="focus:bg-zinc-700 focus:text-white">
                      <span className="font-mono text-amber-500">.{fmt.ext}</span>
                      <span className="text-zinc-300 ml-2">— {fmt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Output Directory */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-zinc-300">Output Folder</Label>
              <button
                onClick={handleSelectDir}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200
                  ${outputDir 
                    ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500/70" 
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-md ${outputDir ? "bg-emerald-500/20" : "bg-zinc-700"}`}>
                    <FolderOpen className={`w-4 h-4 ${outputDir ? "text-emerald-400" : "text-zinc-400"}`} />
                  </div>
                  <span className={`text-sm truncate ${outputDir ? "text-white font-medium" : "text-zinc-400"}`}>
                    {outputDir ? outputDir.split(/[/\\]/).pop() || "Selected folder" : "Click to choose destination"}
                  </span>
                </div>
                {outputDir && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            </div>

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

            {/* Convert Button - Solid Accent Color */}
            <Button
              onClick={handleConvert}
              disabled={!isFormValid}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-white 
                font-semibold rounded-lg shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500
                transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  Convert File
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            {/* Helper text */}
            <p className="text-xs text-zinc-500 text-center pt-2">
              Files are processed locally • No uploads • Your data stays private
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}