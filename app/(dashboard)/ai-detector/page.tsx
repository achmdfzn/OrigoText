"use client";

import { useState } from "react";
import { DetectorInput } from "@/components/ai-detector/DetectorInput";
import { DetectorChecking } from "@/components/ai-detector/DetectorChecking";
import { DetectorSummary } from "@/components/ai-detector/DetectorSummary";
import { DetectorSignals } from "@/components/ai-detector/DetectorSignals";
import { SentenceBreakdown } from "@/components/ai-detector/SentenceBreakdown";
import { buildSampleResult } from "@/lib/ai-detection/sample-result";
import type { DetectionResult } from "@/lib/ai-detection/types";

type PageState =
  | { stage: "idle" }
  | { stage: "checking"; documentTitle: string }
  | { stage: "done"; result: DetectionResult };

const CHECKING_DURATION_MS = 3800;

export default function AiDetectorPage() {
  const [pageState, setPageState] = useState<PageState>({ stage: "idle" });

  function runAnalysis(title: string) {
    setPageState({ stage: "checking", documentTitle: title });
    setTimeout(() => {
      setPageState({ stage: "done", result: buildSampleResult() });
    }, CHECKING_DURATION_MS);
  }

  function handleSubmit(text: string) {
    runAnalysis(`Submission — ${text.slice(0, 40).trim()}…`);
  }

  function handleUseSample() {
    runAnalysis("Advances in Neural Text Generation and Detection.docx");
  }

  function handleReset() {
    setPageState({ stage: "idle" });
  }

  if (pageState.stage === "idle")
    return <DetectorInput onSubmit={handleSubmit} onUseSample={handleUseSample} />;

  if (pageState.stage === "checking")
    return <DetectorChecking documentTitle={pageState.documentTitle} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <DetectorSummary result={pageState.result} className="flex-1" />
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 rounded-md border border-border bg-bg px-4 py-2 text-body-sm font-medium text-fg-muted hover:border-accent hover:text-accent transition-colors duration-150"
        >
          New analysis
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <DetectorSignals result={pageState.result} />
        <SentenceBreakdown result={pageState.result} />
      </div>
    </div>
  );
}
