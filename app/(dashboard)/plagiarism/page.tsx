"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadForm } from "@/components/plagiarism/UploadForm";
import { CheckingState } from "@/components/plagiarism/CheckingState";
import { ReportSummary } from "@/components/plagiarism/ReportSummary";
import { SourceRankingList } from "@/components/plagiarism/SourceRankingList";
import { AnnotatedSubmission } from "@/components/plagiarism/AnnotatedSubmission";
import { checkPlagiarism } from "@/lib/api/client";
import { userFacingMessage } from "@/lib/api/errors";
import type { PlagiarismReport } from "@/lib/plagiarism/types";

type PageState =
  | { stage: "idle"; error: string | null }
  | { stage: "checking"; documentTitle: string }
  | { stage: "done"; report: PlagiarismReport };

function titleFor(text: string): string {
  return `Submission — ${text.slice(0, 40).trim()}…`;
}

export default function PlagiarismPage() {
  const [pageState, setPageState] = useState<PageState>({ stage: "idle", error: null });
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Cancel any in-flight check if the user navigates away mid-analysis.
  useEffect(() => () => requestRef.current?.abort(), []);

  const handleSubmit = useCallback(async (text: string) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    const documentTitle = titleFor(text);
    setSelectedSourceId(null);
    setPageState({ stage: "checking", documentTitle });

    try {
      const report = await checkPlagiarism({ text, documentTitle, signal: controller.signal });
      if (controller.signal.aborted) return;
      setPageState({ stage: "done", report });
    } catch (error) {
      if (controller.signal.aborted) return;
      setPageState({ stage: "idle", error: userFacingMessage(error) });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, []);

  function handleReset() {
    requestRef.current?.abort();
    setSelectedSourceId(null);
    setPageState({ stage: "idle", error: null });
  }

  if (pageState.stage === "idle")
    return <UploadForm onSubmit={handleSubmit} error={pageState.error} />;

  if (pageState.stage === "checking")
    return <CheckingState documentTitle={pageState.documentTitle} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <ReportSummary report={pageState.report} className="flex-1" />
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 rounded-md border border-border bg-bg px-4 py-2 text-body-sm font-medium text-fg-muted hover:border-accent hover:text-accent transition-colors duration-150"
        >
          New check
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <SourceRankingList
          report={pageState.report}
          selectedSourceId={selectedSourceId}
          onSelectSource={(id) =>
            setSelectedSourceId((prev) => (prev === id ? null : id))
          }
        />
        <AnnotatedSubmission
          report={pageState.report}
          selectedSource={
            selectedSourceId !== null
              ? (pageState.report.sources.find(
                  (s) => s.source.id === selectedSourceId,
                ) ?? null)
              : null
          }
        />
      </div>
    </div>
  );
}
