"use client";

import { CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { Step } from "../state";

const STEPS: { id: Step; label: string }[] = [
  { id: "config", label: "Configuration" },
  { id: "upload", label: "Upload" },
  { id: "progress", label: "Progress" }, // Optionally hide progress in visual stepper
  { id: "mapping", label: "Mapping" },
  { id: "validation", label: "Validation" },
  { id: "preview", label: "Aperçu" },
  { id: "done", label: "Terminé" },
];

const VISUAL_STEPS = STEPS.filter((s) => s.id !== "progress");

export function Stepper({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const currentVisualIndex = VISUAL_STEPS.findIndex((s) => s.id === currentStep) === -1 
    ? VISUAL_STEPS.findIndex((s) => s.id === "upload") // If progress, show upload active
    : VISUAL_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="relative">
      <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full -translate-y-1/2 bg-muted" />
      
      <div className="flex justify-between">
        {VISUAL_STEPS.map((step, index) => {
          const isActive = index === currentVisualIndex;
          const isCompleted = index < currentVisualIndex || currentStep === "done";

          return (
            <div key={step.id} className="flex flex-col items-center group relative">
              {/* Line completion logic */}
              {index !== 0 && (
                <div
                  className={clsx(
                    "absolute right-1/2 top-4 -z-10 h-0.5 w-full -translate-y-1/2 transition-all duration-300",
                    isCompleted || isActive ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              
              <div
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background text-sm font-semibold transition-all duration-300",
                  isActive && "border-primary text-primary shadow-[0_0_0_4px_rgba(var(--primary),0.1)]",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isCompleted && "border-muted-foreground text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
              </div>
              <span
                className={clsx(
                  "mt-2 hidden sm:block text-xs font-medium",
                  isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
