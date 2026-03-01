# 21 — Design System Best Practices
## Distinctive, Production-Grade UI for DevSync

> Aesthetic direction: **Industrial Precision** — the feel of a serious engineering tool.  
> Think: VS Code meets Linear meets Vercel's dashboard.  
> NOT: another blue/purple SaaS gradient. NOT: generic Material clone.  
> 
> **The one thing users will remember:** razor-thin borders that glow on interaction,  
> monospace accents for technical data (commit hashes, IDs, timestamps),  
> and status colors so clear they communicate state without reading the label.

---

## Prompt for AI Code Generation

```
Apply the DevSync design system across ALL Angular PrimeNG components.
This overrides generic PrimeNG defaults with a distinctive "Industrial Precision" aesthetic.

AESTHETIC DIRECTION:
- Dark: near-black navy (#0A0F1E base) not pure black — gives depth without harshness
- Accent: Electric Indigo (#6366F1) as primary — NOT purple gradient, solid and precise
- Monospace throughout all technical data: commit hashes, IDs, timestamps, code
- Font pairing: 'IBM Plex Mono' for technical data, 'DM Sans' for UI copy
- Borders: 1px solid rgba(255,255,255,0.08) — barely-there, laser-precise
- Hover/focus: border glows to accent color, background shifts 4% lighter
- Motion: 120ms ease-out for micro-interactions, 200ms for panel transitions
- Negative space: generous padding, breathe — avoid cramped layouts
- Status colors are SEMANTIC — never decorative

FORBIDDEN:
- Any gradient background (except hero/splash screens)
- Border-radius > 8px on data elements (cards max 8px, buttons max 6px)
- System fonts (Inter, Roboto, Arial) for UI copy
- Multiple font weights on the same element
- Purple-on-white (the generic AI palette)
```

---

## Complete `styles.scss` (Design System)

```scss
// ══════════════════════════════════════════════════════════════
// DevSync Design System — Industrial Precision
// ══════════════════════════════════════════════════════════════

// ── Font Import ───────────────────────────────────────────────
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');

// ── PrimeNG Base ──────────────────────────────────────────────
@import "primeng/resources/themes/lara-dark-blue/theme.css";
@import "primeng/resources/primeng.min.css";
@import "primeicons/primeicons.css";
@import "primeflex/primeflex.css";
@import "highlight.js/styles/github-dark-dimmed.css";

// ══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ══════════════════════════════════════════════════════════════
:root {
  // ── Palette ──────────────────────────────────────────────────
  --ds-base-950:     #060910;
  --ds-base-900:     #0A0F1E;    // ← app background
  --ds-base-800:     #111827;    // ← card surface
  --ds-base-700:     #1B2436;    // ← elevated surface
  --ds-base-600:     #253047;    // ← hover surface
  --ds-base-500:     #334155;    // ← border
  --ds-base-400:     #4B5563;    // ← muted border
  --ds-base-300:     #6B7280;    // ← subtle text
  --ds-base-200:     #9CA3AF;    // ← secondary text
  --ds-base-100:     #E2E8F0;    // ← body text
  --ds-base-50:      #F8FAFC;    // ← headings

  // ── Accent ───────────────────────────────────────────────────
  --ds-accent:       #6366F1;    // Electric Indigo
  --ds-accent-dim:   rgba(99, 102, 241, 0.12);
  --ds-accent-glow:  rgba(99, 102, 241, 0.35);
  --ds-accent-light: #818CF8;    // for text on dark

  // ── Semantic Status ──────────────────────────────────────────
  --ds-status-backlog:     #475569;
  --ds-status-todo:        #3B82F6;
  --ds-status-inprogress:  #F59E0B;
  --ds-status-inreview:    #A78BFA;
  --ds-status-done:        #10B981;
  --ds-status-cancelled:   #EF4444;

  // ── Priority ─────────────────────────────────────────────────
  --ds-priority-critical:  #EF4444;
  --ds-priority-high:      #F97316;
  --ds-priority-medium:    #EAB308;
  --ds-priority-low:       #22C55E;
  --ds-priority-none:      #475569;

  // ── Typography ───────────────────────────────────────────────
  --ds-font-ui:     'DM Sans', system-ui, sans-serif;
  --ds-font-mono:   'IBM Plex Mono', 'Fira Code', monospace;

  // ── Spacing (8pt grid) ───────────────────────────────────────
  --ds-space-1:  4px;
  --ds-space-2:  8px;
  --ds-space-3:  12px;
  --ds-space-4:  16px;
  --ds-space-6:  24px;
  --ds-space-8:  32px;
  --ds-space-12: 48px;

  // ── Borders ──────────────────────────────────────────────────
  --ds-border:         1px solid rgba(255,255,255,0.07);
  --ds-border-accent:  1px solid var(--ds-accent);
  --ds-border-radius:  6px;
  --ds-border-radius-lg: 10px;

  // ── Shadows ──────────────────────────────────────────────────
  --ds-shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
  --ds-shadow-md:  0 4px 16px rgba(0,0,0,0.5);
  --ds-shadow-accent: 0 0 0 1px var(--ds-accent-glow), 0 4px 20px rgba(99,102,241,0.15);

  // ── Transitions ──────────────────────────────────────────────
  --ds-transition-fast:   all 120ms ease-out;
  --ds-transition-normal: all 200ms ease-out;
  --ds-transition-slow:   all 350ms cubic-bezier(0.4, 0, 0.2, 1);

  // ── Map to PrimeNG variables ─────────────────────────────────
  --surface-ground:   var(--ds-base-900);
  --surface-section:  var(--ds-base-800);
  --surface-card:     var(--ds-base-800);
  --surface-overlay:  var(--ds-base-700);
  --surface-hover:    var(--ds-base-600);
  --surface-border:   var(--ds-base-500);
  --text-color:            var(--ds-base-100);
  --text-color-secondary:  var(--ds-base-200);
  --primary-color:         var(--ds-accent);
}

// ══════════════════════════════════════════════════════════════
// GLOBAL RESET & BASE
// ══════════════════════════════════════════════════════════════
*, *::before, *::after { box-sizing: border-box; }

html { font-size: 14px; }

body {
  font-family: var(--ds-font-ui);
  background:  var(--ds-base-900);
  color:       var(--ds-base-100);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

// ══════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ══════════════════════════════════════════════════════════════
h1, h2, h3, h4, h5, h6 {
  font-family: var(--ds-font-ui);
  font-weight: 600;
  color: var(--ds-base-50);
  letter-spacing: -0.02em;
  line-height: 1.25;
}

// Monospace for ALL technical values
.mono, code, pre,
.task-id, .commit-hash, .version-badge,
[data-type="id"], [data-type="hash"] {
  font-family: var(--ds-font-mono);
}

// ══════════════════════════════════════════════════════════════
// LAYOUT SHELL
// ══════════════════════════════════════════════════════════════
.layout-wrapper {
  display: flex;
  min-height: 100vh;
}

.layout-sidebar {
  width: 240px;
  flex-shrink: 0;
  background:  var(--ds-base-950);
  border-right: var(--ds-border);
  display: flex;
  flex-direction: column;
  padding: var(--ds-space-4);

  .brand {
    display: flex;
    align-items: center;
    gap: var(--ds-space-3);
    padding: var(--ds-space-3) var(--ds-space-2);
    margin-bottom: var(--ds-space-6);

    .brand-icon {
      width: 32px; height: 32px;
      background: var(--ds-accent);
      border-radius: 8px;
      display: grid; place-items: center;
      color: white; font-size: 16px;
    }

    .brand-name {
      font-family: var(--ds-font-mono);
      font-weight: 500;
      font-size: 1rem;
      color: var(--ds-base-50);
      letter-spacing: -0.01em;
    }
  }
}

.layout-main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR NAV ITEMS
// ══════════════════════════════════════════════════════════════
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-2) var(--ds-space-3);
  border-radius: var(--ds-border-radius);
  color: var(--ds-base-300);
  cursor: pointer;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: var(--ds-transition-fast);
  margin-bottom: 2px;

  .nav-icon { width: 18px; text-align: center; font-size: 0.9rem; }

  &:hover {
    background: var(--ds-base-700);
    color: var(--ds-base-100);
  }

  &.active {
    background: var(--ds-accent-dim);
    color: var(--ds-accent-light);
    border-left: 2px solid var(--ds-accent);
    padding-left: calc(var(--ds-space-3) - 2px);

    .nav-icon { color: var(--ds-accent); }
  }
}

// ══════════════════════════════════════════════════════════════
// TOPBAR
// ══════════════════════════════════════════════════════════════
.layout-topbar {
  height: 52px;
  background: var(--ds-base-900);
  border-bottom: var(--ds-border);
  display: flex;
  align-items: center;
  gap: var(--ds-space-4);
  padding: 0 var(--ds-space-6);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);

  .search-container {
    flex: 1;
    max-width: 400px;

    .p-inputtext {
      background: var(--ds-base-800);
      border-color: transparent;
      border-radius: var(--ds-border-radius);
      font-size: 0.875rem;

      &:focus {
        border-color: var(--ds-accent);
        box-shadow: var(--ds-shadow-accent);
        background: var(--ds-base-700);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════
// CARDS — the baseline data container
// ══════════════════════════════════════════════════════════════
.ds-card {
  background: var(--ds-base-800);
  border: var(--ds-border);
  border-radius: var(--ds-border-radius-lg);
  padding: var(--ds-space-6);
  transition: var(--ds-transition-normal);

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
    box-shadow: var(--ds-shadow-accent);
  }
}

// Stat cards (dashboard)
.stat-card {
  @extend .ds-card;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--accent-color, var(--ds-accent));
    opacity: 0.7;
  }

  .stat-value {
    font-family: var(--ds-font-mono);
    font-size: 2rem;
    font-weight: 500;
    color: var(--ds-base-50);
    line-height: 1;
    margin: var(--ds-space-3) 0;
  }

  .stat-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ds-base-300);
  }

  .stat-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    margin-top: var(--ds-space-2);

    &.up   { color: var(--ds-status-done); }
    &.down { color: var(--ds-status-cancelled); }
  }

  .stat-icon {
    position: absolute;
    top: var(--ds-space-4);
    right: var(--ds-space-4);
    opacity: 0.15;
    font-size: 2.5rem;
  }
}

// ══════════════════════════════════════════════════════════════
// KANBAN CARDS
// ══════════════════════════════════════════════════════════════
.kanban-column {
  width: 272px;
  flex-shrink: 0;
  background: var(--ds-base-800);
  border: var(--ds-border);
  border-radius: var(--ds-border-radius-lg);
  padding: var(--ds-space-4);

  .column-header {
    display: flex;
    align-items: center;
    gap: var(--ds-space-2);
    margin-bottom: var(--ds-space-4);
    padding-bottom: var(--ds-space-3);
    border-bottom: var(--ds-border);

    .column-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
    }

    .column-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ds-base-200);
    }

    .column-count {
      margin-left: auto;
      font-family: var(--ds-font-mono);
      font-size: 0.75rem;
      color: var(--ds-base-400);
      background: var(--ds-base-700);
      padding: 1px 6px;
      border-radius: 10px;
    }
  }
}

.kanban-card {
  background: var(--ds-base-700);
  border: var(--ds-border);
  border-radius: var(--ds-border-radius);
  padding: var(--ds-space-3) var(--ds-space-4);
  margin-bottom: var(--ds-space-2);
  cursor: pointer;
  transition: var(--ds-transition-fast);
  position: relative;

  &:hover {
    border-color: var(--ds-accent);
    box-shadow: 0 0 0 1px var(--ds-accent-glow), var(--ds-shadow-md);
    transform: translateY(-1px);
  }

  &.cdk-drag-preview {
    box-shadow: var(--ds-shadow-accent);
    border-color: var(--ds-accent);
    opacity: 0.95;
  }

  &.cdk-drag-placeholder {
    opacity: 0;
    background: var(--ds-accent-dim);
    border: 1px dashed var(--ds-accent);
  }

  .card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--ds-space-2);
  }

  .card-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ds-base-100);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--ds-space-3);
    padding-top: var(--ds-space-2);
    border-top: var(--ds-border);
  }
}

// ══════════════════════════════════════════════════════════════
// STATUS & PRIORITY BADGES
// ══════════════════════════════════════════════════════════════
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;

  &::before {
    content: '';
    width: 5px; height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  &.backlog     { color: var(--ds-status-backlog);    background: rgba(71,85,105,0.15); }
  &.todo        { color: var(--ds-status-todo);       background: rgba(59,130,246,0.12); }
  &.in-progress { color: var(--ds-status-inprogress); background: rgba(245,158,11,0.12); }
  &.in-review   { color: var(--ds-status-inreview);   background: rgba(167,139,250,0.12); }
  &.done        { color: var(--ds-status-done);       background: rgba(16,185,129,0.12); }
  &.cancelled   { color: var(--ds-status-cancelled);  background: rgba(239,68,68,0.10);
                  text-decoration: line-through; opacity: 0.7; }
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 500;

  .priority-icon { font-size: 0.65rem; }

  &.critical { color: var(--ds-priority-critical); }
  &.high     { color: var(--ds-priority-high); }
  &.medium   { color: var(--ds-priority-medium); }
  &.low      { color: var(--ds-priority-low); }
  &.none     { color: var(--ds-priority-none); }
}

// ══════════════════════════════════════════════════════════════
// COMMIT HASH — monospace, cyan, pill
// ══════════════════════════════════════════════════════════════
.commit-hash {
  font-family: var(--ds-font-mono);
  font-size: 0.8rem;
  color: #67E8F9;
  background: rgba(103, 232, 249, 0.08);
  border: 1px solid rgba(103, 232, 249, 0.15);
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  transition: var(--ds-transition-fast);

  &:hover {
    background: rgba(103, 232, 249, 0.15);
    border-color: rgba(103, 232, 249, 0.3);
  }
}

// Task ID badge
.task-id {
  font-family: var(--ds-font-mono);
  font-size: 0.7rem;
  color: var(--ds-base-300);
  background: var(--ds-base-700);
  padding: 1px 5px;
  border-radius: 3px;
}

// ══════════════════════════════════════════════════════════════
// WIKI / MARKDOWN RENDERER
// ══════════════════════════════════════════════════════════════
.wiki-body {
  max-width: 780px;
  line-height: 1.8;

  :deep(h1) {
    font-size: 1.75rem; font-weight: 700; color: var(--ds-base-50);
    margin: 2rem 0 1rem; letter-spacing: -0.03em;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--ds-accent);
    display: inline-block;
  }

  :deep(h2) {
    font-size: 1.25rem; font-weight: 600; color: var(--ds-base-100);
    margin: 1.75rem 0 0.75rem; letter-spacing: -0.02em;
    border-bottom: var(--ds-border); padding-bottom: 0.4rem;
  }

  :deep(h3) { font-size: 1.05rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }

  :deep(p) { margin-bottom: 1rem; color: var(--ds-base-200); }

  :deep(a) { color: var(--ds-accent-light); text-decoration: underline;
              text-underline-offset: 3px; &:hover { color: white; } }

  :deep(code:not(pre code)) {
    font-family: var(--ds-font-mono); font-size: 0.85em;
    background: var(--ds-base-700); color: #F9A8D4;
    padding: 2px 6px; border-radius: 4px;
    border: var(--ds-border);
  }

  :deep(pre) {
    background: var(--ds-base-950); border: var(--ds-border);
    border-left: 3px solid var(--ds-accent);
    border-radius: var(--ds-border-radius); padding: 1.25rem;
    overflow-x: auto; margin: 1.5rem 0;
    font-family: var(--ds-font-mono); font-size: 0.85rem; line-height: 1.7;
  }

  :deep(table) {
    width: 100%; border-collapse: collapse; margin: 1.5rem 0;
    font-size: 0.9rem;

    thead tr { border-bottom: 2px solid var(--ds-accent); }
    th { font-weight: 600; color: var(--ds-base-50); padding: 0.6rem 1rem;
         text-align: left; font-size: 0.8rem; text-transform: uppercase;
         letter-spacing: 0.05em; }
    td { padding: 0.6rem 1rem; border-bottom: var(--ds-border); color: var(--ds-base-200); }
    tr:hover td { background: var(--ds-base-700); }
  }

  :deep(blockquote) {
    border-left: 3px solid var(--ds-accent);
    margin: 1.5rem 0; padding: 0.75rem 1.25rem;
    background: var(--ds-accent-dim); border-radius: 0 var(--ds-border-radius) var(--ds-border-radius) 0;
    p { color: var(--ds-base-200); margin: 0; font-style: italic; }
  }

  // Confluence-style info panels
  :deep(.confluence-info) {
    background: rgba(59,130,246,0.08); border-left: 3px solid #3B82F6;
    padding: 1rem 1.25rem; border-radius: 0 var(--ds-border-radius) var(--ds-border-radius) 0;
    margin: 1rem 0; font-size: 0.9rem;
  }
  :deep(.confluence-tip) {
    background: rgba(16,185,129,0.08); border-left: 3px solid #10B981;
    padding: 1rem 1.25rem; border-radius: 0 var(--ds-border-radius) var(--ds-border-radius) 0; margin: 1rem 0;
  }
  :deep(.confluence-warning) {
    background: rgba(245,158,11,0.08); border-left: 3px solid #F59E0B;
    padding: 1rem 1.25rem; border-radius: 0 var(--ds-border-radius) var(--ds-border-radius) 0; margin: 1rem 0;
  }
  :deep(.confluence-note) {
    background: rgba(239,68,68,0.08); border-left: 3px solid #EF4444;
    padding: 1rem 1.25rem; border-radius: 0 var(--ds-border-radius) var(--ds-border-radius) 0; margin: 1rem 0;
  }

  :deep(.mermaid-diagram) {
    background: var(--ds-base-950); border: var(--ds-border);
    border-radius: var(--ds-border-radius-lg); padding: 1.5rem;
    text-align: center; margin: 1.5rem 0;
    svg { max-width: 100%; }
  }
}

// ══════════════════════════════════════════════════════════════
// PRIMENG COMPONENT OVERRIDES — precision adjustments
// ══════════════════════════════════════════════════════════════
.p-card {
  background: var(--ds-base-800);
  border: var(--ds-border);
  border-radius: var(--ds-border-radius-lg);
  box-shadow: var(--ds-shadow-sm);

  .p-card-title { font-size: 0.9rem; font-weight: 600; color: var(--ds-base-50); }
}

.p-button {
  border-radius: var(--ds-border-radius);
  font-family: var(--ds-font-ui);
  font-weight: 500;
  font-size: 0.875rem;
  transition: var(--ds-transition-fast);

  &:focus-visible {
    outline: 2px solid var(--ds-accent);
    outline-offset: 2px;
  }
}

.p-inputtext {
  border-radius: var(--ds-border-radius);
  border-color: var(--ds-base-500);
  background: var(--ds-base-800);
  color: var(--ds-base-100);
  font-family: var(--ds-font-ui);
  font-size: 0.875rem;
  transition: var(--ds-transition-fast);

  &:focus {
    border-color: var(--ds-accent);
    box-shadow: 0 0 0 2px var(--ds-accent-dim);
    background: var(--ds-base-700);
  }
}

.p-dialog {
  background: var(--ds-base-800);
  border: var(--ds-border);
  border-radius: var(--ds-border-radius-lg);
  box-shadow: 0 25px 50px rgba(0,0,0,0.7);
  .p-dialog-header { border-bottom: var(--ds-border); padding: 1.25rem 1.5rem; }
  .p-dialog-footer { border-top: var(--ds-border); padding: 1rem 1.5rem; }
}

.p-datatable {
  .p-datatable-thead > tr > th {
    background: var(--ds-base-950);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ds-base-300);
    border-bottom: var(--ds-border);
    padding: 0.6rem 1rem;
  }
  .p-datatable-tbody > tr {
    border-bottom: var(--ds-border);
    &:hover { background: var(--ds-base-700); }
    > td { padding: 0.75rem 1rem; font-size: 0.875rem; }
  }
}

// ══════════════════════════════════════════════════════════════
// ANIMATIONS
// ══════════════════════════════════════════════════════════════
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--ds-accent); box-shadow: 0 0 0 0 var(--ds-accent-glow); }
  50%       { box-shadow: 0 0 0 4px rgba(99,102,241,0); }
}

.animate-in    { animation: fadeSlideIn 200ms ease-out forwards; }
.animate-in-delayed {
  animation: fadeSlideIn 200ms ease-out forwards;
  opacity: 0;
  @for $i from 1 through 8 {
    &:nth-child(#{$i}) { animation-delay: #{($i - 1) * 40}ms; }
  }
}

// ══════════════════════════════════════════════════════════════
// SCROLLBAR — consistent cross-browser
// ══════════════════════════════════════════════════════════════
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--ds-base-500); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--ds-accent); }

// ══════════════════════════════════════════════════════════════
// PRINT / PDF EXPORT (for wiki pages)
// ══════════════════════════════════════════════════════════════
@media print {
  .layout-sidebar, .layout-topbar, .wiki-toolbar { display: none !important; }
  body { background: white; color: #111; }
  .wiki-body :deep(*) { color: #111 !important; background: white !important; }
  .wiki-body :deep(pre) { border: 1px solid #ccc; background: #f8f8f8 !important; }
}
```

---

## Design Tokens Angular Service (type-safe token access)

```typescript
// shared/design/design-tokens.ts
export const DesignTokens = {
  status: {
    BACKLOG:     { css: 'backlog',     color: '#475569', icon: 'pi pi-circle' },
    TODO:        { css: 'todo',        color: '#3B82F6', icon: 'pi pi-circle-fill' },
    IN_PROGRESS: { css: 'in-progress', color: '#F59E0B', icon: 'pi pi-spin pi-spinner' },
    IN_REVIEW:   { css: 'in-review',   color: '#A78BFA', icon: 'pi pi-eye' },
    DONE:        { css: 'done',        color: '#10B981', icon: 'pi pi-check-circle' },
    CANCELLED:   { css: 'cancelled',   color: '#EF4444', icon: 'pi pi-times-circle' }
  },
  priority: {
    CRITICAL: { css: 'critical', color: '#EF4444', icon: 'pi pi-angle-double-up' },
    HIGH:     { css: 'high',     color: '#F97316', icon: 'pi pi-angle-up' },
    MEDIUM:   { css: 'medium',   color: '#EAB308', icon: 'pi pi-minus' },
    LOW:      { css: 'low',      color: '#22C55E', icon: 'pi pi-angle-down' },
    NONE:     { css: 'none',     color: '#475569', icon: 'pi pi-minus' }
  }
} as const;

// Usage in any component — no hardcoded color strings scattered around
@Component({ template: `
  <span class="status-badge" [class]="tokens.status[task.status].css">
    <i [class]="tokens.status[task.status].icon"></i>
    {{ task.status | titlecase }}
  </span>
`})
export class TaskStatusBadgeComponent {
  @Input({ required: true }) task!: TaskDto;
  tokens = DesignTokens;
}
```
