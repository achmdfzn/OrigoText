"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DetectorInput } from "@/components/ai-detector/DetectorInput";
import { DetectorChecking } from "@/components/ai-detector/DetectorChecking";
import { DetectorSummary } from "@/components/ai-detector/DetectorSummary";
import { DetectorSignals } from "@/components/ai-detector/DetectorSignals";
import { SentenceBreakdown } from "@/components/ai-detector/SentenceBreakdown";
import { detectAiText } from "@/lib/api/client";
import { userFacingMessage } from "@/lib/api/errors";
import { buildSampleResult } from "@/lib/ai-detection/sample-result";
import type { DetectionResult } from "@/lib/ai-detection/types";

type PageState =
  | { stage: "idle"; error: string | null }
  | { stage: "checking"; documentTitle: string }
  | { stage: "done"; result: DetectionResult };

export default function AiDetectorPage() {
  const [pageState, setPageState] = useState<PageState>({ stage: "idle", error: null });
  const requestRef = useRef<AbortController | null>(null);

  // Cancel any in-flight analysis if the user navigates away mid-request.
  useEffect(() => () => requestRef.current?.abort(), []);

  const handleSubmit = useCallback(async (text: string) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    const documentTitle = `Submission — ${text.slice(0, 40).trim()}…`;
    setPageState({ stage: "checking", documentTitle });

    try {
      const result = await detectAiText({ text, documentTitle, signal: controller.signal });
      if (controller.signal.aborted) return;
      setPageState({ stage: "done", result });
    } catch (error) {
      if (controller.signal.aborted) return;
      setPageState({ stage: "idle", error: userFacingMessage(error) });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, []);

  // The sample stays local so the walkthrough works without a running backend.
  function handleUseSample() {
    requestRef.current?.abort();
    setPageState({ stage: "done", result: buildSampleResult() });
  }

  function handleReset() {
    requestRef.current?.abort();
    setPageState({ stage: "idle", error: null });
  }

  if (pageState.stage === "idle")
    return (
      <DetectorInput
        onSubmit={handleSubmit}
        onUseSample={handleUseSample}
        error={pageState.error}
      />
    );

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
