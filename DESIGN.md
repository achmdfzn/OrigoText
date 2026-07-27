---
name: origotext-design-system
description: Visual identity and design system for OrigoText. Follows the DESIGN.md standard of Open Design and stays compatible with the Open Design Skill Protocol and Claude Skill Specification.
version: 1.0.0
compatibility:
  - Open Design DESIGN.md standard
  - Open Design Skill Protocol
  - Claude Skill Specification
reference: https://github.com/nexu-io/open-design
---

# OrigoText — Design System (DESIGN.md)

> OrigoText should feel **professional, modern, minimal, academic, and enterprise-grade**: calm surfaces, precise typography, evidence shown clearly, and never a decorative flourish that competes with meaning. This document defines the tokens and patterns that every UI must use. Implementation rules live in `CLAUDE.md §4.1`; scope in `PRD.md`; the Frontend Engineer Agent owns adherence.

---

## 1. Design principles

1. **Clarity over cleverness.** A researcher scanning a similarity report should never wonder what a color or number means. Meaning is explicit.
2. **Evidence-first.** The interface foregrounds evidence (matched text, confidence, sources), not verdicts. Scores are always paired with their explanation.
3. **Calm density.** Academic work is dense; we manage density with generous spacing, clear hierarchy, and progressive disclosure — never clutter.
4. **Honest signaling.** Risk and probability are communicated with restraint. No alarmist red for a probabilistic AI score; color encodes level, text encodes certainty.
5. **Accessible by default.** Every pattern meets WCAG 2.2 AA. Nothing relies on color alone.
6. **Consistent, tokenized, themeable.** All values come from tokens; light and dark are first-class; the system is Open Design compatible.

---

## 2. Brand & visual identity

- **Personality.** Trustworthy, precise, scholarly, quietly modern. Think a well-designed research instrument, not a consumer app.
- **Logo usage.** Wordmark "OrigoText" in the display typeface; the "O" doubles as an origin mark. Minimum clear space equal to the cap-height on all sides. Never stretch, recolor outside brand tokens, or place on low-contrast backgrounds.
- **Voice in UI copy.** Plain, direct, non-accusatory. Prefer "likely AI-generated (78% confidence)" over "AI detected." Prefer "matched sources" over "stolen." Errors are helpful, not blaming.

---

## 3. Color palette (tokens)

Colors are defined as semantic tokens mapped to raw values. Components reference **semantic** tokens only.

### 3.1 Brand & neutrals (raw)

| Token | Light | Dark |
|---|---|---|
| `--color-brand-600` | `#2F5BEA` | `#5B7CFF` |
| `--color-brand-500` | `#3E6BF6` | `#6E8BFF` |
| `--color-brand-050` | `#EEF3FF` | `#141B33` |
| `--color-ink-900` | `#0E1524` | `#F4F7FF` |
| `--color-ink-700` | `#2A3350` | `#C9D3EC` |
| `--color-ink-500` | `#5A647F` | `#98A3C0` |
| `--color-surface-000` | `#FFFFFF` | `#0B0F1A` |
| `--color-surface-050` | `#F7F9FC` | `#111726` |
| `--color-surface-100` | `#EEF1F7` | `#18203214` |
| `--color-border` | `#E1E6F0` | `#26304A` |

### 3.2 Semantic tokens

| Semantic token | Maps to | Use |
|---|---|---|
| `--bg` | `surface-000` | Page background |
| `--bg-subtle` | `surface-050` | Panels, cards |
| `--fg` | `ink-900` | Primary text |
| `--fg-muted` | `ink-500` | Secondary text |
| `--accent` | `brand-600` | Primary actions, links |
| `--accent-weak` | `brand-050` | Accent backgrounds |
| `--border` | `border` | Dividers, inputs |

### 3.3 Status & risk scale

Risk uses a graded, non-alarmist scale, always paired with a text label and pattern for accessibility.

| Token | Light | Meaning | Text label |
|---|---|---|---|
| `--risk-none` | `#1F9D6B` | Original / human-likely | "Low" |
| `--risk-low` | `#7FB800` | Minor signal | "Some" |
| `--risk-medium` | `#E0A400` | Notable signal | "Moderate" |
| `--risk-high` | `#E5652B` | Strong signal | "High" |
| `--risk-critical` | `#D33A52` | Very strong signal | "Very high" |

| Feedback token | Light | Use |
|---|---|---|
| `--success` | `#1F9D6B` | Confirmations |
| `--warning` | `#E0A400` | Cautions |
| `--danger` | `#D33A52` | Errors, destructive |
| `--info` | `#2F5BEA` | Neutral information |

**Similarity highlight scale** (for matched text) uses the risk ramp at reduced opacity backgrounds with a solid left border, and each highlight carries a tooltip + label — never color alone.

### 3.4 Contrast rules
Body text ≥ 4.5:1 against its background; large text and UI components ≥ 3:1. Risk colors are validated in both themes; where a color falls short as text, it is used as a fill with dark/light ink on top.


---

## 4. Typography

### 4.1 Type scale (tokens)

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `--text-display` | 2.25rem / 36px | 1.2 | 600 | Hero headings |
| `--text-heading-1` | 1.75rem / 28px | 1.25 | 600 | Page titles |
| `--text-heading-2` | 1.375rem / 22px | 1.3 | 600 | Section headings |
| `--text-heading-3` | 1.125rem / 18px | 1.35 | 600 | Card/panel headings |
| `--text-body-lg` | 1rem / 16px | 1.6 | 400 | Primary body |
| `--text-body` | 0.9375rem / 15px | 1.6 | 400 | Default body |
| `--text-body-sm` | 0.875rem / 14px | 1.55 | 400 | Secondary body, labels |
| `--text-caption` | 0.75rem / 12px | 1.5 | 400 | Captions, metadata |
| `--text-mono` | 0.875rem / 14px | 1.6 | 400 | Code, DOIs, identifiers |

### 4.2 Typefaces

- **Display & UI:** Inter (variable) — clean, legible, widely available, excellent at small sizes.
- **Monospace:** JetBrains Mono — for DOIs, code, identifiers, and report data.
- **Fallback stack:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

### 4.3 Rules

- Never set body text below 14px.
- Line length: 60–80 characters for reading-optimized prose; unconstrained for data tables.
- Heading hierarchy is semantic (`h1`–`h6`), not decorative.
- Avoid all-caps for body text; use `font-variant-numeric: tabular-nums` for numbers in tables.

---

## 5. Spacing & layout

### 5.1 Spacing scale (4px base)

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4px | Tight internal gaps |
| `--space-2` | 8px | Icon-label gaps, tight padding |
| `--space-3` | 12px | Compact padding |
| `--space-4` | 16px | Default padding, card gaps |
| `--space-5` | 20px | Section gaps |
| `--space-6` | 24px | Panel padding |
| `--space-8` | 32px | Section separation |
| `--space-10` | 40px | Large section gaps |
| `--space-12` | 48px | Page-level vertical rhythm |
| `--space-16` | 64px | Hero spacing |

### 5.2 Layout grid

- **Desktop (≥1280px):** 12-column, 24px gutters, 80px side margins.
- **Tablet (768–1279px):** 8-column, 20px gutters, 40px side margins.
- **Mobile (<768px):** 4-column, 16px gutters, 16px side margins.
- **Max content width:** 1440px centered.
- **Dashboard sidebar:** 240px fixed; collapses to icon-only (56px) at tablet; bottom sheet on mobile.

### 5.3 Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Badges, tags |
| `--radius-md` | 8px | Buttons, inputs, cards |
| `--radius-lg` | 12px | Panels, modals |
| `--radius-xl` | 16px | Large cards |
| `--radius-full` | 9999px | Pills, avatars |

---

## 6. Component tokens & patterns

### 6.1 Buttons

Three variants: `primary` (filled accent), `secondary` (outlined), `ghost` (text-only). Three sizes: `sm` (32px height), `md` (40px), `lg` (48px). Destructive actions use `--danger` fill. Every button has a visible focus ring (2px offset, `--accent`). Disabled state uses 40% opacity, `cursor: not-allowed`.

### 6.2 Inputs & forms

Height 40px (md), 36px (sm). Border `--border`, focus border `--accent` with a 3px ring. Error state border `--danger` with an inline error message below (never only color). Labels above inputs, never placeholder-only. Required fields marked with an asterisk and `aria-required`.

### 6.3 Cards

Background `--bg-subtle`, border `1px solid --border`, radius `--radius-lg`, padding `--space-6`. Hover: subtle shadow lift (`0 4px 16px rgba(0,0,0,0.08)`). Interactive cards have a visible focus ring.

### 6.4 Similarity highlight component

Used in plagiarism reports. Matched text is wrapped in a `<mark>` with a background from the risk ramp at 20% opacity and a 2px left border at full opacity. A tooltip on hover shows source, similarity %, and confidence. The highlight is also indicated by a pattern (dashed underline) for color-blind users. Legend always visible.

### 6.5 Confidence / probability bar

A horizontal bar with a fill from the risk ramp. Always accompanied by a numeric label (e.g., "78%") and a text descriptor (e.g., "Moderate confidence"). Never shown without the caveat copy for AI-detection results.

### 6.6 Data tables

Built on shadcn/ui Table. Sticky header, sortable columns, row hover, zebra striping optional. Pagination with cursor-based navigation. Export button (CSV/JSON) in the toolbar. Keyboard navigable.

### 6.7 Navigation

Top bar: logo, global search, notifications, user menu. Sidebar: grouped nav items with icons + labels; active state uses `--accent-weak` background + `--accent` left border. Breadcrumbs on deep pages.

---

## 7. Iconography

- **Library:** Lucide Icons (consistent stroke weight, open license).
- **Size:** 16px (inline/small), 20px (default UI), 24px (feature icons), 32px (empty states).
- **Stroke:** 1.5px at 20px; scale proportionally.
- **Color:** inherits `currentColor`; never hardcoded.
- **Accessibility:** decorative icons have `aria-hidden="true"`; meaningful icons have an `aria-label` or adjacent visible label.

---

## 8. Animation & motion

### 8.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 100ms | Micro-interactions (hover, focus) |
| `--duration-base` | 200ms | Transitions (color, border) |
| `--duration-slow` | 350ms | Panel open/close, modals |
| `--duration-page` | 500ms | Page transitions |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful reveals |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Exits |

### 8.2 Rules

- **Respect `prefers-reduced-motion`.** When set, all transitions collapse to instant or a simple opacity fade ≤ 100ms. No transforms, no spring, no parallax.
- Animate `opacity` and `transform` only (GPU-composited); never animate `width`, `height`, or `top/left`.
- Progress indicators for long jobs use a streaming bar (SSE/WS-driven), not a spinner that implies unknown duration.
- Framer Motion is the implementation library; use `AnimatePresence` for mount/unmount.

---

## 9. Interaction patterns

- **Drag-and-drop upload.** Drop zone with dashed border, animated fill on drag-over, progress bar on upload, error state with retry.
- **Realtime progress.** Long jobs (plagiarism check, AI detection) stream progress via WebSocket. Show step labels ("Parsing…", "Retrieving candidates…", "Scoring…") not just a percentage.
- **Optimistic updates.** UI reflects the expected state immediately; rolls back with an error toast on failure.
- **Keyboard shortcuts.** Documented in a `?` help overlay. Common: `⌘K` global search, `U` upload, `N` new document, `Esc` close modal.
- **Notifications.** Toast for transient feedback (top-right, 4s auto-dismiss, pause on hover). Persistent alerts in a notification panel. Never block the primary content.
- **Empty states.** Illustrated (SVG), with a clear action CTA. Never a blank white box.
- **Error states.** Inline for form fields; full-page for fatal errors with a recovery action; toast for transient failures.

---

## 10. Responsive behavior

- **Mobile-first CSS.** Base styles target mobile; breakpoints add complexity.
- **Dashboard on mobile.** Sidebar becomes a bottom navigation bar (5 primary items). Secondary nav in a slide-up sheet.
- **Tables on mobile.** Horizontal scroll with a sticky first column; or card-list view for narrow viewports.
- **Upload on mobile.** Tap-to-select replaces drag-and-drop; camera capture available for OCR use cases.
- **Reports on mobile.** Side-by-side comparison collapses to a tabbed view (original / matched).

---

## 11. Dark mode

Dark mode is a first-class theme, not an afterthought. All semantic tokens have dark-mode values (see §3). Rules:

- Use `color-scheme: light dark` on `:root`; respect `prefers-color-scheme` by default; allow user override stored in Zustand (persisted).
- Surfaces in dark mode use dark blues (`#0B0F1A`, `#111726`) — not pure black — for reduced eye strain in long reading sessions.
- Shadows in dark mode are replaced with subtle borders and glow effects (no dark-on-dark shadows).
- Risk highlight backgrounds use higher opacity in dark mode to maintain contrast.
- All contrast ratios re-validated in dark theme.

---

## 12. Accessibility

- **WCAG 2.2 AA** is the minimum target; AAA where feasible.
- Focus management: modals trap focus; after close, focus returns to the trigger.
- Skip-to-content link at the top of every page.
- All interactive elements reachable and operable by keyboard.
- ARIA roles, labels, and live regions on dynamic content (progress, notifications, report updates).
- Color is never the sole differentiator: risk levels use color + pattern + text label.
- Data visualizations (citation graphs, similarity charts) have text alternatives and keyboard-navigable data tables.
- Automated: axe-core in CI; manual: screen-reader testing (NVDA/VoiceOver) on critical flows.

---

## 13. Illustration & branding

- **Style.** Minimal, line-based SVG illustrations. Academic but not stuffy — think clean diagrams, not clip art.
- **Palette.** Brand blue + ink neutrals + one accent per illustration. No gradients in illustrations.
- **Empty states.** Each has a unique illustration; reuse is avoided.
- **Spot icons.** For feature cards and onboarding; 48×48px, consistent stroke.
- **Logo.** SVG only; never rasterized below 2× resolution.

---

## 14. Open Design compatibility

This design system is structured to be compatible with the [Open Design](https://github.com/nexu-io/open-design) ecosystem:

- Tokens are defined as CSS custom properties and can be exported as a Design Token Community Group (DTCG) JSON.
- Component patterns follow the Open Design Skill Protocol's component contract format.
- The `SKILL.md` file references this document for visual constraints in report and UI generation skills.
- Illustrations and icons are SVG-first and embeddable in Open Design canvases.

---

*Every UI decision should be traceable to a token or pattern in this document. When a new pattern is needed, define it here first, then implement it. Undocumented one-offs are technical debt.*

