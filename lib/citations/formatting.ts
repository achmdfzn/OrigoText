import type { CitationStyle, Reference, ReferenceAuthor } from "./types";

function initials(given: string): string {
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}.`)
    .join(" ");
}

function initialsCompact(given: string): string {
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function joinWithConjunction(
  items: ReadonlyArray<string>,
  conjunction: string,
): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")}${conjunction}${items[items.length - 1]}`;
}

function apaAuthors(authors: ReadonlyArray<ReferenceAuthor>): string {
  const formatted = authors.map((a) => `${a.family}, ${initials(a.given)}`);
  if (formatted.length === 0) return "";
  if (formatted.length === 1) return formatted[0];
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
}

function ieeeAuthors(authors: ReadonlyArray<ReferenceAuthor>): string {
  const formatted = authors.map((a) => `${initials(a.given)} ${a.family}`);
  return joinWithConjunction(formatted, " and ");
}

function mlaAuthors(authors: ReadonlyArray<ReferenceAuthor>): string {
  if (authors.length === 0) return "";
  const first = `${authors[0].family}, ${authors[0].given}`;
  if (authors.length === 1) return first;
  if (authors.length > 2) return `${first}, et al`;
  return `${first}, and ${authors[1].given} ${authors[1].family}`;
}

function chicagoAuthors(authors: ReadonlyArray<ReferenceAuthor>): string {
  if (authors.length === 0) return "";
  const first = `${authors[0].family}, ${authors[0].given}`;
  const rest = authors.slice(1).map((a) => `${a.given} ${a.family}`);
  return joinWithConjunction([first, ...rest], ", and ");
}

function vancouverAuthors(authors: ReadonlyArray<ReferenceAuthor>): string {
  const shown = authors.slice(0, 6);
  const formatted = shown.map((a) => `${a.family} ${initialsCompact(a.given)}`);
  const suffix = authors.length > 6 ? ", et al" : "";
  return `${formatted.join(", ")}${suffix}`;
}

function harvardAuthors(authors: ReadonlyArray<ReferenceAuthor>): string {
  const formatted = authors.map((a) => `${a.family}, ${initials(a.given)}`);
  return joinWithConjunction(formatted, " and ");
}

function year(ref: Reference): string {
  return ref.year !== null ? String(ref.year) : "n.d.";
}

function volumeIssuePages(ref: Reference): string {
  const parts: string[] = [];
  if (ref.volume !== null) parts.push(ref.volume);
  if (ref.issue !== null) parts.push(`(${ref.issue})`);
  const vi = parts.join("");
  if (vi && ref.pages !== null) return `${vi}, ${ref.pages}`;
  if (vi) return vi;
  if (ref.pages !== null) return ref.pages;
  return "";
}

function doiSuffix(ref: Reference): string {
  if (ref.doi !== null) return ` https://doi.org/${ref.doi}`;
  if (ref.url !== null) return ` ${ref.url}`;
  return "";
}

function formatApa(ref: Reference): string {
  const authors = apaAuthors(ref.authors);
  const base = `${authors} (${year(ref)}). ${ref.title}.`;
  if (ref.journal !== null) {
    const vip = volumeIssuePages(ref);
    const journalPart = vip
      ? ` ${ref.journal}, ${vip}.`
      : ` ${ref.journal}.`;
    return `${base}${journalPart}${doiSuffix(ref)}`.trim();
  }
  const publisherPart = ref.publisher !== null ? ` ${ref.publisher}.` : "";
  return `${base}${publisherPart}${doiSuffix(ref)}`.trim();
}

function formatIeee(ref: Reference, index: number): string {
  const authors = ieeeAuthors(ref.authors);
  if (ref.journal !== null) {
    const vip: string[] = [];
    if (ref.volume !== null) vip.push(`vol. ${ref.volume}`);
    if (ref.issue !== null) vip.push(`no. ${ref.issue}`);
    if (ref.pages !== null) vip.push(`pp. ${ref.pages}`);
    vip.push(year(ref));
    return `[${index}] ${authors}, "${ref.title}," ${ref.journal}, ${vip.join(", ")}.`;
  }
  const publisher = ref.publisher !== null ? `${ref.publisher}, ` : "";
  return `[${index}] ${authors}, ${ref.title}. ${publisher}${year(ref)}.`;
}

function formatMla(ref: Reference): string {
  const authors = mlaAuthors(ref.authors);
  if (ref.journal !== null) {
    const parts: string[] = [ref.journal];
    if (ref.volume !== null) parts.push(`vol. ${ref.volume}`);
    if (ref.issue !== null) parts.push(`no. ${ref.issue}`);
    parts.push(year(ref));
    if (ref.pages !== null) parts.push(`pp. ${ref.pages}`);
    return `${authors}. "${ref.title}." ${parts.join(", ")}.`;
  }
  const publisher = ref.publisher !== null ? `${ref.publisher}, ` : "";
  return `${authors}. ${ref.title}. ${publisher}${year(ref)}.`;
}

function formatChicago(ref: Reference): string {
  const authors = chicagoAuthors(ref.authors);
  if (ref.journal !== null) {
    const vi: string[] = [];
    if (ref.volume !== null) vi.push(ref.volume);
    if (ref.issue !== null) vi.push(`no. ${ref.issue}`);
    const viPart = vi.length > 0 ? ` ${vi.join(", ")}` : "";
    const pagesPart = ref.pages !== null ? `: ${ref.pages}` : "";
    return `${authors}. "${ref.title}." ${ref.journal}${viPart} (${year(ref)})${pagesPart}.`;
  }
  const place = ref.place !== null ? `${ref.place}: ` : "";
  const publisher = ref.publisher !== null ? ref.publisher : "";
  return `${authors}. ${ref.title}. ${place}${publisher}, ${year(ref)}.`;
}

function formatVancouver(ref: Reference, index: number): string {
  const authors = vancouverAuthors(ref.authors);
  if (ref.journal !== null) {
    const vip: string[] = [];
    if (ref.volume !== null) vip.push(ref.volume);
    if (ref.issue !== null) vip.push(`(${ref.issue})`);
    const vi = vip.join("");
    const pagesPart = ref.pages !== null ? `:${ref.pages}` : "";
    return `${index}. ${authors}. ${ref.title}. ${ref.journal}. ${year(ref)};${vi}${pagesPart}.`;
  }
  const publisher = ref.publisher !== null ? `${ref.publisher}; ` : "";
  return `${index}. ${authors}. ${ref.title}. ${publisher}${year(ref)}.`;
}

function formatHarvard(ref: Reference): string {
  const authors = harvardAuthors(ref.authors);
  if (ref.journal !== null) {
    const vip: string[] = [];
    if (ref.volume !== null) vip.push(ref.volume);
    if (ref.issue !== null) vip.push(`(${ref.issue})`);
    const vi = vip.join("");
    const pagesPart = ref.pages !== null ? `, pp. ${ref.pages}` : "";
    return `${authors} ${year(ref)}, '${ref.title}', ${ref.journal}, ${vi}${pagesPart}.`;
  }
  const publisher = ref.publisher !== null ? `, ${ref.publisher}` : "";
  return `${authors} ${year(ref)}, ${ref.title}${publisher}.`;
}

export function formatReference(
  ref: Reference,
  style: CitationStyle,
  index = 1,
): string {
  switch (style) {
    case "apa7":
      return formatApa(ref);
    case "ieee":
      return formatIeee(ref, index);
    case "mla9":
      return formatMla(ref);
    case "chicago17":
      return formatChicago(ref);
    case "vancouver":
      return formatVancouver(ref, index);
    case "harvard":
      return formatHarvard(ref);
  }
}

export function formatBibliography(
  refs: ReadonlyArray<Reference>,
  style: CitationStyle,
): ReadonlyArray<{ readonly id: string; readonly text: string }> {
  const ordered =
    style === "ieee" || style === "vancouver"
      ? refs
      : [...refs].sort((a, b) =>
          (a.authors[0]?.family ?? a.title).localeCompare(
            b.authors[0]?.family ?? b.title,
          ),
        );
  return ordered.map((ref, i) => ({
    id: ref.id,
    text: formatReference(ref, style, i + 1),
  }));
}
