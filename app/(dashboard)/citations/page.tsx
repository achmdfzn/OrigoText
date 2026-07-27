"use client";

import { useState } from "react";
import { ReferenceList } from "@/components/citations/ReferenceList";
import { BibliographyPanel } from "@/components/citations/BibliographyPanel";
import { DoiLookup } from "@/components/citations/DoiLookup";
import { SAMPLE_LIBRARY } from "@/lib/citations/sample-library";
import type { Reference } from "@/lib/citations/types";

export default function CitationsPage() {
  const [library, setLibrary] = useState<ReadonlyArray<Reference>>(SAMPLE_LIBRARY);
  const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>(
    SAMPLE_LIBRARY.map((r) => r.id),
  );

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleAdd(ref: Reference) {
    if (library.some((r) => r.id === ref.id)) return;
    setLibrary((prev) => [...prev, ref]);
    setSelectedIds((prev) => [...prev, ref.id]);
  }

  const selectedRefs = library.filter((r) => selectedIds.includes(r.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-semibold text-fg">Citation Manager</h1>
        <p className="text-body-sm text-fg-muted">
          Manage references and generate formatted bibliographies in APA, IEEE,
          MLA, Chicago, Vancouver, and Harvard.
        </p>
      </div>

      <DoiLookup onAdd={handleAdd} existingIds={library.map((r) => r.id)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReferenceList
          references={library}
          selectedIds={selectedIds}
          onToggle={handleToggle}
        />
        <BibliographyPanel references={selectedRefs} />
      </div>
    </div>
  );
}
