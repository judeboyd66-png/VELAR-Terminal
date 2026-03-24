# Project Rules

## Goal
Build a premium macro research terminal that helps retail traders quickly understand markets.

The product should feel modern, clean, and high-end — similar to top-tier platforms, not a generic dashboard.

Focus on clarity, speed, and usability over complexity.

---

## Product Direction

The app has two layers:

### 1. Public Landing Page
- Modern, high-quality UI (similar to 21st.dev style)
- Clear message and positioning
- “Join Waitlist” / “Subscribe for Access”
- Minimal text, strong visuals

### 2. Private Terminal
Core sections (direction only, not all built yet):
- Overview (primary focus now)
- Calendar (Forex Factory inspired, simplified)
- Macro (Fed, inflation, labor, oil)
- Journal (notes, ideas)
- News (curated, minimal)

IMPORTANT:
Only build the Overview page for now unless explicitly told otherwise.

---

## Development Rules
- Only build what is needed right now
- Do NOT create future features or pages
- Remove unused code when identified
- Keep file structure simple and clean
- Avoid overengineering

---

## UI Principles
- Clean, minimal, and easy to scan
- Focus on visual hierarchy (what matters first)
- Reduce clutter wherever possible
- Use spacing consistently
- Keep text short and purposeful

Avoid:
- overcrowded layouts
- overly complex UI
- generic “admin dashboard” feel

---

## Components
- Reuse components instead of duplicating
- Store reusable UI in /components/ui
- Keep components small and focused
- Prefer composition over large monolithic components

---

## Layout
- Focus ONLY on the Overview page for the terminal
- Build one page properly before expanding
- Landing page can be built separately when requested

---

## Calendar (Future Direction)
The calendar should be a simplified, visual version of Forex Factory.

Goals:
- Extremely easy to scan
- Minimal text
- Focus on key events
- Clean card-based layout (not tables)

Each event should show:
- Currency
- Event name (e.g. CPI, NFP)
- Time
- Impact level
- Forecast vs Previous

Optional:
- Very short interpretation (one line max)

Avoid:
- large data tables
- cluttered layouts
- excessive text

---

## Constraints (Important)
- Do NOT create pages for Macro, Journal, Calendar, or News yet
- Do NOT add placeholder components
- Do NOT build features “in advance”
- Only implement what is explicitly requested