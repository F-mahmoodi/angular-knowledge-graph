/** A node (entry) in the graph. */
export interface ConstellationNode {
  /** Unique id. */
  id: string;
  /** Display title. */
  title: string;
  /** Type key; must match a `ConstellationType.key` (unknown keys get an automatic color). */
  type: string;
  /** Position on the timeline axis (any numeric scale, e.g. a year or an era index). */
  era?: number | null;
  /** Short description shown in the side panel. */
  snippet?: string;
  /** Absolute image URL shown in the side panel. */
  image?: string;
  /** Link for the "open entry" button. If missing, the button only emits `nodeOpen`. */
  url?: string;
  /** Small tags shown next to the type pill (e.g. "verified", "sample"). */
  tags?: string[];
  /** Free-form payload for your own use (e.g. in `detailTemplate`). */
  data?: unknown;
}

/** An undirected relation between two nodes. */
export interface ConstellationEdge {
  source: string;
  target: string;
  /** Strength of the relation (default 1). Controls thickness, distance and filtering. */
  weight?: number;
  /** Human-readable reason of the relation; shown on the edge and in the panel. */
  label?: string;
  /** Free-form payload. */
  data?: unknown;
}

export interface ConstellationData {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
}

/** Visual type (category) of nodes. */
export interface ConstellationType {
  key: string;
  label: string;
  /** Color in the light theme. */
  color?: string;
  /** Color in the dark theme (defaults to `color`). */
  darkColor?: string;
  /** Color in the night-sky theme (defaults to `darkColor`). */
  skyColor?: string;
}

/** A labelled tick on the timeline axis. */
export interface ConstellationEra {
  value: number;
  label: string;
}

export type LayoutName = 'force' | 'orbit' | 'cluster' | 'timeline' | 'arc';
export type ThemeName = 'light' | 'dark' | 'sky';
export type ThemeSetting = ThemeName | 'auto';
export type LabelMode = 'smart' | 'all' | 'none';

export const LAYOUT_NAMES: readonly LayoutName[] = ['force', 'orbit', 'cluster', 'timeline', 'arc'];
export const THEME_NAMES: readonly ThemeName[] = ['light', 'dark', 'sky'];

/** Toggle parts of the UI. Everything is on by default except `globalShortcuts`. */
export interface ConstellationFeatures {
  toolbar: boolean;
  search: boolean;
  layoutSwitcher: boolean;
  themeSwitcher: boolean;
  help: boolean;
  panel: boolean;
  filters: boolean;
  trail: boolean;
  tour: boolean;
  minimap: boolean;
  zoomControls: boolean;
  /** The "open entry" button in the panel (emits `nodeOpen`, follows `node.url` if set). */
  openButton: boolean;
  /** Listen to keyboard shortcuts on the whole document instead of only when focus is inside. */
  globalShortcuts: boolean;
  /** Which layouts are offered in the switcher (in this order). */
  layouts: LayoutName[];
}

export const DEFAULT_FEATURES: ConstellationFeatures = {
  toolbar: true,
  search: true,
  layoutSwitcher: true,
  themeSwitcher: true,
  help: true,
  panel: true,
  filters: true,
  trail: true,
  tour: true,
  minimap: true,
  zoomControls: true,
  openButton: true,
  globalShortcuts: false,
  layouts: [...LAYOUT_NAMES],
};

/** Context of the optional `detailTemplate` rendered inside the side panel. */
export interface ConstellationDetailContext {
  $implicit: ConstellationNode;
  node: ConstellationNode;
  isFocus: boolean;
}

export interface ConstellationExpandEvent {
  node: ConstellationNode;
  added: number;
}
