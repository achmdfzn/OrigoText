"use client";

import { useState } from "react";
import { UploadForm } from "@/components/plagiarism/UploadForm";
import { CheckingState } from "@/components/plagiarism/CheckingState";
import { ReportSummary } from "@/components/plagiarism/ReportSummary";
import { SourceRankingList } from "@/components/plagiarism/SourceRankingList";
import { AnnotatedSubmission } from "@/components/plagiarism/AnnotatedSubmission";
import { buildSampleReport } from "@/lib/plagiarism/sample-report";
import type { PlagiarismReport } from "@/lib/plagiarism/types";

type PageState =
  | { stage: "idle" }
  | { stage: "checking"; documentTitle: string }
  | { stage: "done"; report: PlagiarismReport };

const CHECKING_DURATION_MS = 3800;

export default function PlagiarismPage() {
  const [pageState, setPageState] = useState<PageState>({ stage: "idle" });
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  function handleSubmit(text: string) {
    setSelectedSourceId(null);
    setPageState({
      stage: "checking",
      documentTitle: `Submission — ${text.slice(0, 40).trim()}…`,
    });
    setTimeout(() => {
      setPageState({ stage: "done", report: buildSampleReport() });
    }, CHECKING_DURATION_MS);
  }

  function handleReset() {
    setSelectedSourceId(null);
    setPageState({ stage: "idle" });
  }

  if (pageState.stage === "idle") return <UploadForm onSubmit={handleSubmit} />;

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
