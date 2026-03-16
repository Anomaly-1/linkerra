"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Upload, FolderSync, FileCog, Wand2, Share } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: <Wand2 className="h-7 w-7" />,
      label: "Smart Organizer",
      desc: "AI-powered file sorting",
      route: "/smart-organizer",
      gradient: "from-violet-500/20 to-fuchsia-500/20",
      iconColor: "text-violet-400",
    },
    {
      icon: <FolderSync className="h-7 w-7" />,
      label: "Drive Sync",
      desc: "Seamless data synchronization",
      route: "/drive-sync",
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-400",
    },
    {
      icon: <Share className="h-7 w-7" />,
      label: "File Transfer",
      desc: "Fast peer-to-peer sharing",
      route: "/file-transfer",
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: <FileCog className="h-7 w-7" />,
      label: "Converter",
      desc: "Multi-format conversion",
      route: "/converter",
      gradient: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
    },
  ];

  // ... imports stay the same

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-950 to-zinc-950 pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 text-center mb-10 max-w-xl px-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-3">
          Toolkit
        </h1>
        <p className="text-zinc-400 text-sm md:text-base">
          Your all-in-one productivity suite. Fast, local, and private.
        </p>
      </div>

      {/* Feature Grid - Fixed sizing to prevent compression */}
      <div className="relative z-10 flex flex-wrap justify-center gap-4 md:gap-5 max-w-6xl w-full px-2">
        {features.map((feature, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => router.push(feature.route)}
                className={`group relative flex flex-col items-center justify-center 
                  w-40 h-40 md:w-44 md:h-44 rounded-2xl 
                  bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 
                  backdrop-blur-sm transition-all duration-300 ease-out
                  hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
                  focus:ring-2 focus:ring-zinc-700 focus:outline-none
                  overflow-hidden shrink-0`}
              >
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Icon */}
                <div className={`relative z-10 p-3 rounded-xl bg-zinc-800/50 group-hover:bg-zinc-800/80 transition-colors ${feature.iconColor} group-hover:scale-110 duration-300`}>
                  {feature.icon}
                </div>
                
                {/* Label */}
                <span className="relative z-10 mt-3 text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors text-center px-2">
                  {feature.label}
                </span>
                
                {/* Description - fades in on hover */}
                <span className="relative z-10 mt-1 text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100 duration-200 text-center px-3">
                  {feature.desc}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-zinc-100">
              {feature.desc}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </main>
  );
}