# Progress Charts Phase 3 Design

## Overview
Phase 3 adds custom SVG chart components to the Progress Dashboard in Calendar, plus a detailed breakdown modal. The implementation uses react-native-svg for rendering and react-native-reanimated/@legendapp/motion for smooth animations, aligned with Sparr’s dark glassmorphic UI.

## Goals
- Provide reusable chart primitives (line + bar) without external charting libs.
- Enhance ProgressRing with milestones, gradients, and animated updates.
- Add a detailed modal view per metric with breakdown + summary stats.
- Integrate modal opening from MetricCardsRow in CalendarScreen.

## Non-Goals
- Badge integration or profile screen changes (Phase 4).
- New backend endpoints or API shape changes.
- Automated tests (no existing suite).

## Component Architecture
- **ChartUtils.ts**: normalization, grid/points, path generation, color helpers, path animation helper.
- **LineChart.tsx**: SVG line path + dots + labels + animated draw-in.
- **BarChart.tsx**: SVG bars + labels + staggered growth animation.
- **ProgressRing.tsx**: animated ring with milestones, gradients, center content.
- **StatsBreakdownModal.tsx**: modal orchestrator; selects chart via CHART_TYPE_MAP and renders breakdown + summary stats.
- **CalendarScreen.tsx**: opens modal via MetricCardsRow tap.

## Data Flow
- `useProgress()` provides `timeframe`, `metrics`, `snapshots`, `loading`, `error`.
- Chart data derives from `snapshots` and selected `metricKey`.
- Labels derive from `snapshot_date` (weekday or short date).
- CHART_TYPE_MAP selects line vs bar; fallback to line if missing.

## Visualization Behavior
- **LineChart**: animated stroke draw-in, optional dots, tap tooltip, grid lines + y/x labels.
- **BarChart**: staggered bar growth, optional value labels, tap tooltip, grid lines.
- **ProgressRing**: percent animation, optional gradient stroke, milestone markers, center content.

## Error & Loading
- Empty/NaN-safe normalization with zero fallback.
- Loading placeholders for charts and modal.
- Graceful error copy if data is unavailable.

## Accessibility & UX
- Touch targets >= 44px for interactive elements.
- Small label text with sufficient contrast (use theme colors).
- Modal supports close via button and backdrop tap.

## Manual Test Plan
- 0/1/many snapshot scenarios.
- Week/month/year labels display correctly.
- Tapping metric opens modal; close restores Calendar.
- ProgressRing still renders in existing contexts.
- Verify smooth animation at 60fps on standard devices.
