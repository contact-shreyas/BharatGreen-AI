# BharatGreen AI Release Notes

Date: 2026-03-20
Release type: Hackathon demo milestone

## Highlights

- Added live APIs for district intensity, regional grid intensity, and district polygons.
- Shipped realistic India operations map with district table, heatmap, choropleth, CSV export, row-to-map focus, reset, and clear filters.
- Added active filters badge for demo visibility.
- Added Decision Action Center with:
  - Cost vs Green tradeoff slider
  - Apply Best Plan action
  - Live What Changed feed with severity color-banding
  - Pinned critical alert block
- Expanded dashboard with additional demo modules:
  - Carbon Budget Gauge
  - Green Scheduler
  - Chat Assistant

## Commit Summary

1. feat(api): add live district/grid endpoints with polygon boundary integration
2. feat(map): ship realistic India map with district table, choropleth, heatmap, and filter badge
3. feat(dashboard): add decision action center, apply-best-plan workflow, cost-green slider, and live event feed
4. refactor(core): refresh BharatGreen naming, live-data hooks, and calculation/types model

## Operational Status

- Production build: passing
- Working tree: clean
- Dev server: start with `cd frontend && npm run dev`

## Demo Notes

- Use the map controls to visibly increase/decrease active filter count.
- Click Apply Best Plan to show immediate region optimization.
- Use the live event feed to narrate real-time decisioning under carbon spikes.
