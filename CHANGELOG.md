# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-10-14

### Added

- `angular-knowledge-graph` package with the `<ngx-constellation>` standalone Angular knowledge graph viewer component (Angular 22, signals, zoneless-friendly).
- Five animated layouts: force, orbit, clusters, timeline (with eras and swim-lanes), arcs.
- Light, dark and night-sky themes; `auto` follows the OS. Theming through `--nc-*` CSS custom properties.
- Details panel with relation label and strength, links grouped by type, custom `detailTemplate`.
- Expand/collapse hidden neighbours, re-centering with a breadcrumb trail, shortest-path finding, search that reveals hidden nodes, guided tour.
- Filters by type, depth and minimum strength; smart label modes; minimap; fullscreen.
- Keyboard shortcuts (also with a Persian keyboard layout), touch gestures, ARIA labels, reduced-motion support.
- English (default, LTR) and Persian (RTL) UI strings, overridable; per-text direction for mixed-language data.
- Bottom-sheet panel on narrow containers.
- Demo app with a sample knowledge graph of the history of computing.
