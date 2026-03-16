"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({
  position = "left",
  className = "",
  backPath = "/",
}: {
  position?: "left" | "right";
  className?: string;
  backPath?: string;
}) {
  const router = useRouter();
  
  const positionClass = position === "right" ? "right-4" : "left-4";

  return (
    <div className={`fixed top-4 z-50 ${positionClass} ${className}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push(backPath)}
        className={`rounded-md w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border-zinc-700`}
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </Button>
    </div>
  );
}