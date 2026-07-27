"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface CheckingStateProps {
  readonly documentTitle: string;
}

const STEPS = [
  { id: "parse", label: "Parsing document" },
  { id: "fingerprint", label: "Generating fingerprints" },
  { id: "lexical", label: "Running lexical similarity" },
  { id: "semantic", label: "Running semantic similarity" },
  { id: "sources", label: "Matching against sources" },
  { id: "report", label: "Building report" },
] as const;

const STEP_DURATION_MS = 600;

export function CheckingState({ documentTitle }: CheckingStateProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= STEPS.length - 1) return;
    const id = setTimeout(() => setActiveStep((s) => s + 1), STEP_DURATION_MS);
    return () => clearTimeout(id);
  }, [activeStep]);

  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-semibold text-fg">Checking document…</h1>
        <p className="text-body-sm text-fg-muted truncate">{documentTitle}</p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Analysis progress: ${progress}%`}
        className="h-2 w-full overflow-hidden rounded-full bg-bg-muted"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="flex flex-col gap-3" aria-label="Analysis steps">
        {STEPS.map((step, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-3 text-body-sm transition-opacity duration-300",
                done || active ? "opacity-100" : "opacity-30",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-caption font-medium",
                  done
                    ? "bg-success text-white"
                    : active
                      ? "bg-accent text-white"
                      : "bg-bg-muted text-fg-muted",
                )}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5L8 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "font-medium",
                  done
                    ? "text-fg-muted line-through"
                    : active
                      ? "text-fg"
                      : "text-fg-muted",
                )}
              >
                {step.label}
              </span>
              {active ? (
                <span
                  aria-hidden="true"
                  className="ml-auto flex gap-1"
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
