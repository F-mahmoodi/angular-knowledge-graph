import { GEdge, GNode, GraphIndex, bfsPath, computeVisible, cssKey, passes } from './graph';
import { ConstellationEra, LabelMode, LayoutName, ThemeName } from './models';
import { ConstellationStrings } from './strings';

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const KMIN = 0.15;
const KMAX = 3;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const circMean = (a: number[]) =>
  Math.atan2(
    a.reduce((s, x) => s + Math.sin(x), 0),
    a.reduce((s, x) => s + Math.cos(x), 0),
  );

/** Direction of a string from its first strong character, so mixed-language data renders right. */
const RTL_RE =
  /^[^A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]*[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
export const textDir = (s: string): 'rtl' | 'ltr' => (RTL_RE.test(s) ? 'rtl' : 'ltr');

function mk<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> | null,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(el);
  return el;
}

interface ViewNode {
  id: string;
  n: GNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  fx: number | null;
  fy: number | null;
  r: number;
  drag?: boolean;
  dying?: boolean;
  orbit?: number;
  ang?: number;
  R?: number;
  pref?: number;
  el: SVGGElement;
  ringEl: SVGCircleElement;
  body: SVGCircleElement;
  lbl: SVGTextElement;
  more: SVGGElement;
  moreT: SVGTextElement;
  pin: SVGCircleElement;
}

interface ViewEdge {
  e: GEdge;
  el: SVGPathElement;
  a: ViewNode;
  b: ViewNode;
}

type Gesture =
  | { type: 'node'; id: string; sx: number; sy: number; moved: boolean }
  | { type: 'pan'; sx: number; sy: number; cx: number; cy: number; moved: boolean }
  | { type: 'pinch'; d0: number; k0: number; w0: [number, number] }
  | { type: 'none' };

interface Tour {
  list: { o: string; e: GEdge }[];
  i: number;
  playing: boolean;
  t0: number;
  pausedAt: number;
}

export interface TourSnapshot {
  i: number;
  n: number;
  playing: boolean;
  from: string;
  to: string;
  label: string;
}

/** Everything the UI needs to render; produced after each state change. */
export interface EngineSnapshot {
  focus: string;
  sel: string | null;
  path: string[] | null;
  trail: string[];
  live: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  pinned: ReadonlySet<string>;
  counts: Readonly<Record<string, number>>;
  nodeCount: number;
  edgeCount: number;
  pick: string | null;
  tour: TourSnapshot | null;
  layout: LayoutName;
  depth: number;
  minWeight: number;
  hiddenTypes: ReadonlySet<string>;
}

export interface EngineHost {
  host: HTMLElement;
  stage: HTMLElement;
  svg: SVGSVGElement;
  stars: HTMLCanvasElement;
  minimap: () => HTMLCanvasElement | null;
  tourProgress: () => HTMLElement | null;
  strings: () => ConstellationStrings;
  isCompact: () => boolean;
  /** Space covered by overlays (filters card, bottom sheet…) that fitting should avoid. */
  insets: () => { left: number; right: number; top: number; bottom: number };
  onChange: () => void;
  onToast: (msg: string) => void;
  onZoom: (percent: number) => void;
  onExpand?: (id: string, added: number) => void;
}

/**
 * Framework-agnostic scene engine: renders the graph into an SVG, runs layouts, physics, camera and
 * pointer interaction. The Angular component is a thin shell around it.
 */
export class ConstellationEngine {
  g!: GraphIndex;
  focus = '';
  sel: string | null = null;
  hover: string | null = null;
  layout: LayoutName = 'force';
  depth = 1;
  labels: LabelMode = 'smart';
  theme: ThemeName = 'light';
  minWeight = 0;
  expanded = new Set<string>();
  extra = new Set<string>();
  hiddenTypes = new Set<string>();
  trail: string[] = [];
  path: string[] | null = null;
  pick: string | null = null;
  tour: Tour | null = null;
  eras: ConstellationEra[] = [];
  tourDuration = 4800;
  maxLabel = 22;

  private V = new Map<string, ViewNode>();
  private VE = new Map<number, ViewEdge>();
  private live: ViewNode[] = [];
  private liveE: ViewEdge[] = [];
  private elabels: { ve: ViewEdge; g: SVGGElement }[] = [];
  private labKey = '';
  private cam = { x: 0, y: 0, k: 1 };
  private camT = { x: 0, y: 0, k: 1 };
  private alpha = 0;
  private userCam = false;
  private layoutAt = 0;
  private dirty = true;
  private camDirty = true;
  private follow: { ids: string[]; until: number } | null = null;
  private ph: number[] = [];
  private raf = 0;
  private lastT = 0;
  private mmTick = 0;
  private mmForce = true;
  private mmT: { s: number; ox: number; oy: number } | null = null;
  private lastLo: boolean | null = null;
  private lastLs = 0;
  private lastZ = -1;
  private colorsDirty = true;
  private colors: Record<string, string> = {};
  private ptrs = new Map<number, [number, number]>();
  private gesture: Gesture | null = null;
  private lastTap: { id: string | null; t: number } = { id: null, t: 0 };
  private emitQueued = false;
  private destroyed = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private cleanups: (() => void)[] = [];
  private readonly reduced: boolean;
  private readonly sctx: CanvasRenderingContext2D | null;
  private readonly vp: SVGGElement;
  private readonly Lbg: SVGGElement;
  private readonly Ledges: SVGGElement;
  private readonly Lel: SVGGElement;
  private readonly Lnodes: SVGGElement;
  private readonly starsData = Array.from({ length: 280 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.25,
    p: Math.random() * TAU,
    s: 0.4 + Math.random() * 1.6,
    z: 0.15 + Math.random() * 0.85,
    w: Math.random() < 0.18,
  }));

  constructor(private readonly h: EngineHost) {
    this.reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = (c: string) => h.svg.querySelector<SVGGElement>('.' + c)!;
    this.vp = q('nc-vp');
    this.Lbg = q('nc-bg');
    this.Ledges = q('nc-edges');
    this.Lel = q('nc-elabels');
    this.Lnodes = q('nc-nodes');
    this.sctx = h.stars.getContext?.('2d') ?? null;
    this.bindPointer();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(h.stage);
      this.cleanups.push(() => ro.disconnect());
    }
    this.resize();
    const { w, h: hh } = this.size();
    this.cam = { x: w / 2, y: hh / 2, k: 0.9 };
    this.camT = { ...this.cam };
    if (typeof requestAnimationFrame === 'function')
      this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  /* ------------------------------------------------------------------ public API */

  setData(g: GraphIndex, focus: string | null) {
    this.g = g;
    this.V.forEach((v) => v.el.remove());
    this.VE.forEach((ve) => ve.el.remove());
    this.V.clear();
    this.VE.clear();
    this.expanded.clear();
    this.extra.clear();
    this.path = null;
    this.sel = null;
    this.tour = null;
    const f = focus && g.node(focus) ? focus : g.defaultFocus();
    this.focus = f ?? '';
    this.trail = f ? [f] : [];
    this.ph = [];
    this.colorsDirty = true;
    this.refresh();
  }

  snapshot(): EngineSnapshot {
    const counts: Record<string, number> = {};
    this.live.forEach((v) => (counts[v.n.type] = (counts[v.n.type] || 0) + 1));
    const pinned = new Set<string>();
    this.V.forEach((v) => {
      if (v.fx != null && v.id !== this.focus) pinned.add(v.id);
    });
    const T = this.tour;
    let tour: TourSnapshot | null = null;
    if (T) {
      const { o, e } = T.list[T.i];
      tour = {
        i: T.i,
        n: T.list.length,
        playing: T.playing,
        from: this.focus,
        to: o,
        label: e.label,
      };
    }
    return {
      focus: this.focus,
      sel: this.sel,
      path: this.path ? [...this.path] : null,
      trail: [...this.trail],
      live: new Set(this.live.map((v) => v.id)),
      expanded: new Set(this.expanded),
      pinned,
      counts,
      nodeCount: this.live.length,
      edgeCount: this.liveE.length,
      pick: this.pick,
      tour,
      layout: this.layout,
      depth: this.depth,
      minWeight: this.minWeight,
      hiddenTypes: new Set(this.hiddenTypes),
    };
  }

  isLive(id: string) {
    const v = this.V.get(id);
    return !!v && !v.dying;
  }

  hiddenCount(id: string) {
    if (!this.g) return 0;
    return this.g.neighbors(id).filter(({ o, e }) => !this.isLive(o) && passes(this.g, o, e, this))
      .length;
  }

  setLayout(l: LayoutName, announce = false) {
    if (l === this.layout && this.live.length) return;
    const was = this.layout;
    this.layout = l;
    this.h.svg.dataset['layout'] = l;
    if (l === 'force' && was !== 'force') this.live.forEach((v) => (v.vx = v.vy = 0));
    if (l !== 'force') this.alpha = 0;
    this.live.forEach((v) => this.placeLabel(v));
    if (!this.g) return;
    this.doLayout();
    this.labKey = '~';
    this.applyHighlight();
    this.autoFit();
    this.dirty = true;
    if (announce) {
      const d = this.h.strings().layouts[l];
      this.h.onToast(`${d.label}: ${d.description}`);
    }
    this.emit();
  }

  setTheme(t: ThemeName) {
    this.theme = t;
    this.colorsDirty = true;
    this.mmForce = true;
    if (t !== 'sky' && this.sctx)
      this.sctx.clearRect(0, 0, this.h.stars.width, this.h.stars.height);
  }

  setLabels(m: LabelMode) {
    this.labels = m;
    this.h.svg.dataset['labels'] = m;
  }

  setDepth(d: number) {
    d = clamp(Math.round(d), 1, 3);
    if (d === this.depth) return;
    this.depth = d;
    if (this.layout === 'force') this.alpha = Math.max(this.alpha, 0.8);
    this.refresh();
  }

  setMinWeight(w: number, fit = false) {
    this.minWeight = w;
    this.refresh({ fit });
  }

  toggleType(k: string) {
    if (this.hiddenTypes.has(k)) this.hiddenTypes.delete(k);
    else this.hiddenTypes.add(k);
    this.refresh();
  }

  select(id: string | null) {
    if (id && !this.isLive(id)) return;
    if (this.sel === id) return;
    this.sel = id;
    if (this.path && id && !this.path.includes(id)) this.path = null;
    this.applyHighlight();
    this.emit();
  }

  setHover(id: string | null) {
    if (id && !this.isLive(id)) id = null;
    if (this.hover === id) return;
    this.hover = id;
    this.applyHighlight();
  }

  toggleExpand(id: string) {
    const hid = this.hiddenCount(id);
    const t = this.short(this.g.node(id)!.title, 20);
    const S = this.h.strings();
    if (hid === 0) {
      if (this.expanded.has(id) && id !== this.focus) {
        this.expanded.delete(id);
        this.refresh({ fit: false });
        this.h.onToast(S.toastCollapsed(t));
      } else this.h.onToast(S.toastAllShown);
      return;
    }
    this.expanded.add(id);
    this.sel = id;
    this.refresh({ fit: false });
    if (this.layout === 'force') {
      this.userCam = false;
      this.layoutAt = performance.now();
      this.alpha = Math.max(this.alpha, 0.7);
    } else this.fitTo(this.bbox(true));
    this.h.onToast(S.toastExpanded(hid, t));
    this.h.onExpand?.(id, hid);
  }

  recenter(id: string, fromTrail = false) {
    if (!this.g?.node(id)) return;
    this.stopTour();
    this.setPick(null);
    if (!fromTrail) {
      const i = this.trail.indexOf(id);
      if (i >= 0) this.trail = this.trail.slice(0, i + 1);
      else this.trail.push(id);
    }
    const v = this.V.get(id);
    if (v) this.shiftWorld(v.x, v.y);
    this.V.forEach((u) => {
      u.fx = u.fy = null;
      u.el.classList.remove('nc-pinned');
    });
    this.focus = id;
    this.sel = null;
    this.path = null;
    this.expanded.clear();
    this.extra.clear();
    this.ph = [];
    if (this.layout === 'force') this.alpha = 1;
    this.refresh();
    this.h.onToast(this.h.strings().toastRecentered(this.g.node(id)!.title));
  }

  goBack() {
    if (this.trail.length < 2) return;
    this.trail.pop();
    this.recenter(this.trail[this.trail.length - 1], true);
  }

  trailTo(i: number) {
    if (i < 0 || i >= this.trail.length) return;
    this.trail = this.trail.slice(0, i + 1);
    this.recenter(this.trail[i], true);
  }

  showPath(a: string, b: string) {
    const p = bfsPath(this.g, a, b);
    const S = this.h.strings();
    if (!p) {
      this.h.onToast(S.toastNoPath);
      return;
    }
    this.stopTour();
    this.path = p;
    p.forEach((id) => this.extra.add(id));
    this.sel = b;
    this.refresh({ fit: false });
    this.userCam = true;
    this.later(() => this.fitIds(p), 60);
    this.h.onToast(
      S.toastPath(
        p.length - 1,
        this.short(this.g.node(a)!.title, 16),
        this.short(this.g.node(b)!.title, 16),
      ),
    );
  }

  clearPath() {
    if (!this.path) return;
    this.path = null;
    this.applyHighlight();
    this.emit();
  }

  /** Select a node; if it is hidden, reveal it together with its path from the focus. */
  reveal(id: string) {
    if (!this.g.node(id)) return;
    this.stopTour();
    if (this.isLive(id)) {
      this.select(id);
      this.flyTo(id);
      return;
    }
    const p = bfsPath(this.g, this.focus, id);
    if (!p) return;
    this.path = p;
    p.forEach((x) => this.extra.add(x));
    this.sel = id;
    this.refresh({ fit: false });
    this.userCam = true;
    this.later(() => this.fitIds(p), 60);
  }

  revealNeighbor(id: string) {
    this.extra.add(id);
    this.refresh({ fit: false });
    this.select(id);
    if (this.layout === 'force') {
      this.userCam = false;
      this.layoutAt = performance.now();
    } else this.fitTo(this.bbox(true));
  }

  setPick(id: string | null) {
    if (this.pick === id) return;
    this.pick = id;
    this.emit();
  }

  unpin(id: string) {
    const v = this.V.get(id);
    if (!v) return;
    v.fx = v.fy = null;
    v.el.classList.remove('nc-pinned');
    this.alpha = Math.max(this.alpha, 0.4);
    this.emit();
  }

  unpinAll() {
    this.V.forEach((v) => {
      if (v.id !== this.focus) {
        v.fx = v.fy = null;
        v.el.classList.remove('nc-pinned');
      }
    });
    if (this.layout === 'force') this.alpha = Math.max(this.alpha, 0.5);
    this.h.onToast(this.h.strings().toastReleased);
    this.emit();
  }

  /** Move the selection to the next/previous link of the focus, clockwise. */
  cycle(dir: 1 | -1) {
    const f = this.V.get(this.focus);
    if (!f) return;
    const L = this.live.filter((v) => {
      const e = this.g.edgeOf(this.focus, v.id);
      return v.id !== this.focus && !!e && this.VE.has(e.i);
    });
    if (!L.length) return;
    L.sort((a, b) => Math.atan2(a.y - f.y, a.x - f.x) - Math.atan2(b.y - f.y, b.x - f.x));
    let i = L.findIndex((v) => v.id === this.sel);
    i = i < 0 ? 0 : (i + dir + L.length) % L.length;
    this.select(L[i].id);
    this.ensureVisible(L[i]);
    L[i].el.focus({ preventScroll: true });
  }

  startTour() {
    const list = this.g
      .neighbors(this.focus)
      .filter(({ o, e }) => this.isLive(o) && this.VE.has(e.i))
      .slice()
      .sort((a, b) => b.e.w - a.e.w)
      .slice(0, 12);
    if (!list.length) {
      this.h.onToast(this.h.strings().tourNoLinks);
      return;
    }
    this.path = null;
    this.setPick(null);
    this.tour = { list, i: 0, playing: true, t0: 0, pausedAt: 0 };
    this.tourGo(0);
  }

  tourGo(i: number) {
    const T = this.tour;
    if (!T) return;
    T.i = clamp(i, 0, T.list.length - 1);
    T.t0 = performance.now();
    T.pausedAt = 0;
    const { o } = T.list[T.i];
    this.sel = null;
    this.select(o);
    this.flyBetween(this.focus, o);
    this.emit();
  }

  pauseTour() {
    const T = this.tour;
    if (!T || !T.playing) return;
    T.playing = false;
    T.pausedAt = (performance.now() - T.t0) / this.tourDuration;
    this.emit();
  }

  playTour() {
    const T = this.tour;
    if (!T || T.playing) return;
    T.playing = true;
    T.t0 = performance.now() - T.pausedAt * this.tourDuration;
    this.emit();
  }

  stopTour(done = false) {
    if (!this.tour) return;
    this.tour = null;
    if (done) {
      this.h.onToast(this.h.strings().tourEnded);
      this.autoFit();
    }
    this.emit();
  }

  fit() {
    this.autoFit();
  }

  zoomBy(f: number) {
    const { w, h } = this.size();
    const sx = w / 2;
    const sy = h / 2;
    const wx = (sx - this.camT.x) / this.camT.k;
    const wy = (sy - this.camT.y) / this.camT.k;
    const k = clamp(this.camT.k * f, KMIN, KMAX);
    this.camT = { k, x: sx - wx * k, y: sy - wy * k };
    this.userCam = true;
  }

  flyTo(id: string, k?: number) {
    const v = this.V.get(id);
    if (!v) return;
    const { w, h } = this.size();
    k = k || Math.max(this.camT.k, 1);
    const x = this.layout === 'force' ? v.x : v.tx;
    const y = this.layout === 'force' ? v.y : v.ty;
    this.camT = { k, x: w / 2 - x * k, y: h / 2 - y * k };
    this.userCam = true;
  }

  /** Called when overlays change size (e.g. the filters card opens). */
  relayoutCamera() {
    if (!this.userCam) this.autoFit();
  }

  focusNode(id: string) {
    this.V.get(id)?.el.focus({ preventScroll: true });
  }

  destroy() {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.timers.forEach((t) => clearTimeout(t));
    this.cleanups.forEach((c) => c());
    this.V.forEach((v) => v.el.remove());
    this.VE.forEach((ve) => ve.el.remove());
    this.Lbg.textContent = '';
    this.Lel.textContent = '';
  }

  /* ------------------------------------------------------------------ internals */

  private emit() {
    if (this.emitQueued || this.destroyed) return;
    this.emitQueued = true;
    queueMicrotask(() => {
      this.emitQueued = false;
      if (!this.destroyed) this.h.onChange();
    });
  }

  private later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.destroyed) fn();
    }, ms);
    this.timers.add(t);
  }

  private short(s: string, n = this.maxLabel) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  private typeVar(k: string) {
    return `var(--nc-t-${cssKey(k)})`;
  }

  private size() {
    const r = this.h.stage.getBoundingClientRect();
    return { w: r.width || 800, h: r.height || 600 };
  }

  private makeNode(v: ViewNode) {
    const n = v.n;
    const g = mk(
      'g',
      { class: 'nc-node', 'data-id': n.id, tabindex: 0, role: 'button' },
      this.Lnodes,
    );
    g.style.setProperty('--c', this.typeVar(n.type));
    const inner = mk('g', { class: 'nc-inner' }, g);
    v.ringEl = mk('circle', { class: 'nc-ring' }, inner);
    v.body = mk('circle', { class: 'nc-body' }, inner);
    v.lbl = mk('text', { class: 'nc-lbl' }, inner);
    v.lbl.textContent = this.short(n.title);
    v.lbl.style.direction = textDir(n.title);
    v.more = mk('g', { class: 'nc-more' }, inner);
    mk('circle', { r: 8.5 }, v.more);
    v.moreT = mk('text', { dy: '.35em' }, v.more);
    v.pin = mk('circle', { class: 'nc-pin', r: 3 }, inner);
    v.el = g;
    v.r = 0;
  }

  private updateNode(v: ViewNode) {
    const isF = v.id === this.focus;
    const r = isF ? 30 : v.n.r0;
    if (r !== v.r) {
      v.r = r;
      v.body.setAttribute('r', String(r));
      v.ringEl.setAttribute('r', String(r + 7));
      v.more.setAttribute(
        'transform',
        `translate(${(-r * 0.75).toFixed(1)},${(-r * 0.75).toFixed(1)})`,
      );
      v.pin.setAttribute('cx', (r * 0.7).toFixed(1));
      v.pin.setAttribute('cy', (-r * 0.7).toFixed(1));
    }
    this.placeLabel(v);
    v.el.classList.toggle('nc-focus', isF);
    const hid = this.hiddenCount(v.id);
    v.el.classList.toggle('nc-has-more', hid > 0);
    v.moreT.textContent = '+' + hid;
    const S = this.h.strings();
    v.el.setAttribute('aria-label', S.nodeAria(v.n.title, this.typeLabel(v.n.type), isF, hid));
  }

  private typeLabel(k: string) {
    return this.typeLabels.get(k) ?? k;
  }
  typeLabels = new Map<string, string>();

  private placeLabel(v: ViewNode) {
    if (this.layout === 'arc') {
      v.lbl.setAttribute(
        'transform',
        `translate(0,${v.r + 7}) rotate(${this.h.strings().dir === 'rtl' ? -55 : 55})`,
      );
      v.lbl.setAttribute('y', '0');
      v.lbl.setAttribute('dy', '.35em');
      v.lbl.style.textAnchor = 'start';
    } else {
      v.lbl.removeAttribute('transform');
      v.lbl.setAttribute('y', String(v.r + (v.id === this.focus ? 6 : 4)));
      v.lbl.setAttribute('dy', '.95em');
      v.lbl.style.textAnchor = '';
    }
  }

  private pathEdges() {
    const s = new Set<number>();
    if (this.path)
      for (let i = 1; i < this.path.length; i++) {
        const e = this.g.edgeOf(this.path[i - 1], this.path[i]);
        if (e) s.add(e.i);
      }
    return s;
  }

  private refresh(o: { fit?: boolean } = {}) {
    if (!this.g) return;
    const vis = computeVisible(this.g, this);
    for (const [id, v] of this.V)
      if (!vis.has(id) && !v.dying) {
        v.dying = true;
        v.el.classList.add('nc-out');
        v.el.setAttribute('tabindex', '-1');
        this.later(() => {
          if (v.dying && this.V.get(id) === v) {
            v.el.remove();
            this.V.delete(id);
          }
        }, 340);
      }
    for (const [id, par] of vis) {
      const v = this.V.get(id);
      if (v && v.dying) {
        v.dying = false;
        v.el.classList.remove('nc-out');
        v.el.setAttribute('tabindex', '0');
      } else if (!v) {
        const p = (par && this.V.get(par)) || this.V.get(this.focus);
        const x0 = p ? p.x : 0;
        const y0 = p ? p.y : 0;
        const j = () => (Math.random() - 0.5) * 24;
        const nv = {
          id,
          n: this.g.node(id)!,
          x: x0 + j(),
          y: y0 + j(),
          vx: 0,
          vy: 0,
          tx: x0,
          ty: y0,
          fx: null,
          fy: null,
        } as unknown as ViewNode;
        this.makeNode(nv);
        this.V.set(id, nv);
      }
    }
    this.live = [...this.V.values()].filter((v) => !v.dying);
    const pe = this.pathEdges();
    const want = new Set<number>();
    for (const e of this.g.edges)
      if (this.isLive(e.a) && this.isLive(e.b) && (e.w >= this.minWeight || pe.has(e.i)))
        want.add(e.i);
    for (const [i, ve] of this.VE)
      if (!want.has(i)) {
        ve.el.remove();
        this.VE.delete(i);
      }
    want.forEach((i) => {
      let ve = this.VE.get(i);
      if (!ve) {
        const e = this.g.edges[i];
        const el = mk('path', { class: 'nc-edge' }, this.Ledges);
        el.style.strokeWidth = (0.7 + (e.w / this.g.maxWeight) * 2.6).toFixed(2);
        ve = { e, el } as ViewEdge;
        this.VE.set(i, ve);
      }
      ve.a = this.V.get(ve.e.a)!;
      ve.b = this.V.get(ve.e.b)!;
    });
    this.liveE = [...this.VE.values()];
    this.live.forEach((v) => this.updateNode(v));
    if (this.sel && !this.isLive(this.sel)) this.sel = null;
    this.doLayout();
    this.labKey = '~';
    this.applyHighlight();
    if (o.fit !== false) this.autoFit();
    this.dirty = true;
    this.emit();
  }

  /* ---------------------------------------------------------------- layouts */

  private wTo(v: ViewNode) {
    let m = 0;
    for (const { o, e } of this.g.neighbors(v.id))
      if (this.VE.has(e.i)) m = Math.max(m, e.w + (o === this.focus ? 1e4 : 0));
    return m;
  }

  private hopsFrom() {
    const h = new Map<string, number>([[this.focus, 0]]);
    let fr = [this.focus];
    while (fr.length) {
      const nx: string[] = [];
      for (const id of fr)
        for (const { o, e } of this.g.neighbors(id))
          if (this.VE.has(e.i) && !h.has(o)) {
            h.set(o, h.get(id)! + 1);
            nx.push(o);
          }
      fr = nx;
    }
    return h;
  }

  private shiftWorld(ox: number, oy: number) {
    this.V.forEach((u) => {
      u.x -= ox;
      u.y -= oy;
      u.tx -= ox;
      u.ty -= oy;
      if (u.fx != null && u.fy != null) {
        u.fx -= ox;
        u.fy -= oy;
      }
    });
    this.cam.x += ox * this.cam.k;
    this.cam.y += oy * this.cam.k;
    this.camT.x += ox * this.camT.k;
    this.camT.y += oy * this.camT.k;
    this.camDirty = true;
    this.dirty = true;
  }

  private doLayout() {
    this.Lbg.textContent = '';
    const f = this.V.get(this.focus);
    if (this.layout === 'force') {
      if (f && f.fx == null) {
        if (f.x || f.y) this.shiftWorld(f.x, f.y);
        f.fx = 0;
        f.fy = 0;
      }
      this.alpha = Math.max(this.alpha, 0.9);
      this.layoutAt = performance.now();
      return;
    }
    if (this.layout === 'orbit') this.layOrbit();
    else if (this.layout === 'cluster') this.layCluster();
    else if (this.layout === 'timeline') this.layTimeline();
    else this.layArc();
  }

  private layOrbit() {
    const h = this.hopsFrom();
    let maxh = 0;
    h.forEach((d) => (maxh = Math.max(maxh, d)));
    const rings: ViewNode[][] = [];
    this.live.forEach((v) => {
      const d = v.id === this.focus ? 0 : (h.get(v.id) ?? maxh + 1);
      v.orbit = d;
      (rings[d] = rings[d] || []).push(v);
    });
    const f = this.V.get(this.focus);
    if (f) {
      f.ang = 0;
      f.R = 0;
    }
    const S = this.h.strings();
    let R = 0;
    for (let d = 1; d < rings.length; d++) {
      const ring = rings[d];
      if (!ring) continue;
      if (this.ph[d] == null) this.ph[d] = 0;
      const ph = this.ph[d];
      const n = ring.length;
      R = d === 1 ? Math.max(240, (n * 98) / TAU) : Math.max(R + 190, (n * 72) / TAU);
      if (d === 1) {
        ring.sort(
          (a, b) =>
            this.g.typeIndex(a.n.type) - this.g.typeIndex(b.n.type) || this.wTo(b) - this.wTo(a),
        );
        ring.forEach((v, i) => (v.ang = (i / n) * TAU - Math.PI / 2 - ph));
      } else {
        ring.forEach((v) => {
          const ps = this.g
            .neighbors(v.id)
            .filter(
              (x) => this.VE.has(x.e.i) && this.isLive(x.o) && this.V.get(x.o)!.orbit === d - 1,
            )
            .map((x) => this.V.get(x.o)!.ang! + (this.ph[d - 1] || 0));
          v.pref = ps.length ? circMean(ps) : 0;
        });
        ring.sort((a, b) => a.pref! - b.pref!);
        const off = circMean(ring.map((v, i) => v.pref! - (i / n) * TAU));
        ring.forEach((v, i) => (v.ang = off + (i / n) * TAU - ph));
      }
      ring.forEach((v) => (v.R = R));
      mk('circle', { class: 'nc-orbit', r: R.toFixed(1) }, this.Lbg);
      const t = mk('text', { class: 'nc-bglbl', x: 0, y: (-R - 30).toFixed(1) }, this.Lbg);
      t.textContent = d === 1 ? S.orbitDirect : S.orbitSteps(d);
    }
    this.orbitTargets();
  }

  private orbitTargets() {
    this.live.forEach((v) => {
      if (!v.orbit) {
        v.tx = 0;
        v.ty = 0;
        return;
      }
      const a = v.ang! + (this.ph[v.orbit] || 0);
      v.tx = Math.cos(a) * v.R!;
      v.ty = Math.sin(a) * v.R!;
    });
  }

  private layCluster() {
    const f = this.V.get(this.focus);
    if (f) {
      f.tx = 0;
      f.ty = 0;
    }
    const G: Record<string, ViewNode[]> = {};
    this.live.forEach((v) => {
      if (v.id !== this.focus) (G[v.n.type] = G[v.n.type] || []).push(v);
    });
    const ks = this.g.typeOrder.filter((k) => G[k]);
    const m = ks.length;
    const Rc = (k: string) => 30 + Math.sqrt(G[k].length) * 50;
    const maxRc = Math.max(0, ...ks.map(Rc));
    const D = m > 1 ? Math.max(250, (maxRc + 44) / Math.sin(Math.PI / m)) : 240;
    ks.forEach((k, i) => {
      const a = (i / m) * TAU - Math.PI / 2;
      const cx = Math.cos(a) * D;
      const cy = Math.sin(a) * D;
      const rc = Rc(k);
      G[k]
        .sort((p, q) => this.wTo(q) - this.wTo(p))
        .forEach((v, j) => {
          const rr = G[k].length === 1 ? 0 : 50 * Math.sqrt(j + 0.5);
          const aa = j * 2.39996 + a;
          v.tx = cx + Math.cos(aa) * rr;
          v.ty = cy + Math.sin(aa) * rr;
        });
      const g = mk('g', { class: 'nc-blob' }, this.Lbg);
      g.style.setProperty('--c', this.typeVar(k));
      mk('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: (rc + 34).toFixed(1) }, g);
      const t = mk('text', { x: cx.toFixed(1), y: (cy - rc - 46).toFixed(1) }, g);
      t.textContent = `${this.typeLabel(k)} · ${this.h.strings().num(G[k].length)}`;
    });
  }

  private layTimeline() {
    const S = this.h.strings();
    const rtl = S.dir === 'rtl';
    const sgn = rtl ? -1 : 1;
    // Axis = half linear time, half ordinal (equal spacing per distinct date of the visible nodes),
    // so both "1 to 8" and "1791 to 2021 with a dense 1940s" spread out readably.
    const vals = [
      ...new Set(this.live.map((v) => this.g.eraOf(v.id)).filter((x): x is number => x != null)),
    ].sort((a, b) => a - b);
    const range: [number, number] | null = vals.length ? [vals[0], vals[vals.length - 1]] : null;
    const span = range ? Math.max(range[1] - range[0], 1e-9) : 1;
    const W = Math.max(1100, vals.length * 70);
    const rankOf = (e: number) => {
      if (vals.length < 2) return 0.5;
      if (e <= vals[0]) return 0;
      if (e >= vals[vals.length - 1]) return 1;
      let i = 0;
      while (vals[i + 1] < e) i++;
      return (i + (e - vals[i]) / (vals[i + 1] - vals[i])) / (vals.length - 1);
    };
    const eraX = (e: number) => {
      const lin = range ? (e - range[0]) / span : 0.5;
      return sgn * ((lin + rankOf(e)) / 2 - 0.5) * W;
    };
    const ks = this.g.typeOrder.filter((k) => this.live.some((v) => v.n.type === k));
    const LH = 118;
    const y0 = (-(ks.length - 1) / 2) * LH;
    let xmin = Infinity;
    let xmax = -Infinity;
    ks.forEach((k, li) => {
      const L = this.live
        .filter((v) => v.n.type === k)
        .map((v, idx) => {
          const era = this.g.eraOf(v.id);
          return { v, x: era == null ? (range ? 0 : sgn * idx * 96) : eraX(era) };
        })
        .sort((a, b) => sgn * (a.x - b.x));
      const orig = L.map((o) => o.x);
      let prev = -sgn * Infinity;
      L.forEach((o) => {
        if (sgn * (o.x - prev) < 96) o.x = prev + sgn * 96;
        prev = o.x;
      });
      const shift = (L.reduce((s, o, i) => s + (orig[i] - o.x), 0) / L.length) * 0.5;
      L.forEach((o, i) => {
        o.v.tx = o.x + shift;
        o.v.ty = y0 + li * LH + (L.length > 1 ? (i % 2 ? 14 : -14) : 0);
        xmin = Math.min(xmin, o.v.tx);
        xmax = Math.max(xmax, o.v.tx);
      });
    });
    if (range)
      this.eras.forEach(({ value }) => {
        const x = eraX(value);
        if (x > xmin - 60 && x < xmax + 60) {
          xmin = Math.min(xmin, x);
          xmax = Math.max(xmax, x);
        }
      });
    if (!isFinite(xmin)) return;
    // the lane titles sit on the inline-start side (right in RTL, left in LTR)
    const X0 = xmin - (rtl ? 120 : 250);
    const X1 = xmax + (rtl ? 250 : 120);
    ks.forEach((k, li) => {
      const y = y0 + li * LH;
      const g = mk('g', { class: 'nc-lane' }, this.Lbg);
      g.style.setProperty('--c', this.typeVar(k));
      mk('rect', { x: X0, y: y - LH / 2 + 6, width: X1 - X0, height: LH - 12, rx: 20 }, g);
      const t = mk('text', { x: rtl ? X1 - 18 : X0 + 18, y: y + 5 }, g);
      t.textContent = this.typeLabel(k);
    });
    if (!range) return;
    const ay = y0 - LH / 2 - 30;
    const a0 = rtl ? X0 : X0 + 230;
    const a1 = rtl ? X1 - 230 : X1;
    mk('line', { class: 'nc-axis', x1: a0, y1: ay, x2: a1, y2: ay }, this.Lbg);
    const ar = mk('text', { class: 'nc-eralbl', x: rtl ? a0 + 8 : a1 - 8, y: ay - 10 }, this.Lbg);
    ar.style.textAnchor = 'end';
    ar.textContent = S.timeArrow;
    this.eras.forEach(({ value, label }) => {
      const x = eraX(value);
      if (x < a0 + 40 || x > a1 - 40) return;
      mk(
        'line',
        { class: 'nc-tick', x1: x, y1: ay, x2: x, y2: y0 + (ks.length - 0.5) * LH },
        this.Lbg,
      );
      mk('circle', { class: 'nc-eradot', cx: x, cy: ay, r: 3.5 }, this.Lbg);
      const t = mk('text', { class: 'nc-eralbl', x, y: ay - 12 }, this.Lbg);
      t.textContent = label;
    });
  }

  private layArc() {
    const others = this.live
      .filter((v) => v.id !== this.focus)
      .sort(
        (a, b) =>
          this.g.typeIndex(a.n.type) - this.g.typeIndex(b.n.type) || this.wTo(b) - this.wTo(a),
      );
    const mid = Math.floor(others.length / 2);
    const f = this.V.get(this.focus);
    const order = [...others.slice(0, mid), ...(f ? [f] : []), ...others.slice(mid)];
    const gap = 58;
    const n = order.length;
    const sgn = this.h.strings().dir === 'rtl' ? 1 : -1;
    order.forEach((v, i) => {
      v.tx = sgn * ((n - 1) / 2 - i) * gap;
      v.ty = 0;
    });
    mk(
      'line',
      {
        class: 'nc-axis',
        x1: ((n - 1) / 2) * gap + 50,
        y1: 0,
        x2: (-(n - 1) / 2) * gap - 50,
        y2: 0,
      },
      this.Lbg,
    );
  }

  private forceStep() {
    const L = this.live;
    const n = L.length;
    const a = this.alpha;
    for (let i = 0; i < n; i++) {
      const p = L[i];
      for (let j = i + 1; j < n; j++) {
        const q = L[j];
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d2 = dx * dx + dy * dy + 0.01;
        }
        const d = Math.sqrt(d2);
        const f = (460 * a) / d;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        p.vx -= fx;
        p.vy -= fy;
        q.vx += fx;
        q.vy += fy;
        const min = p.r + q.r + 34;
        if (d < min) {
          const s = ((min - d) / d) * 0.25;
          p.x -= dx * s;
          p.y -= dy * s;
          q.x += dx * s;
          q.y += dy * s;
        }
      }
    }
    for (const { e, a: p, b: q } of this.liveE) {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const rel = (e.w / this.g.maxWeight) * 12;
      const Lr = 70 + p.r + q.r + Math.max(0, 12 - rel) * 7;
      const k = ((d - Lr) / d) * a * 0.16;
      p.vx += dx * k;
      p.vy += dy * k;
      q.vx -= dx * k;
      q.vy -= dy * k;
    }
    for (const v of L) {
      v.vx -= v.x * 0.006 * a;
      v.vy -= v.y * 0.006 * a;
      v.vx *= 0.58;
      v.vy *= 0.58;
      if (v.drag) v.vx = v.vy = 0;
      else if (v.fx != null && v.fy != null) {
        v.x = v.fx;
        v.y = v.fy;
        v.vx = v.vy = 0;
      } else {
        v.x += v.vx;
        v.y += v.vy;
      }
    }
    this.alpha += (0 - this.alpha) * 0.016;
  }

  /* --------------------------------------------------------------- geometry */

  private edgeCtrl(a: ViewNode, b: ViewNode): [number, number] {
    const c = this.layout === 'timeline' ? 0.22 : 0.12;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return [(a.x + b.x) / 2 - dy * c, (a.y + b.y) / 2 + dx * c];
  }

  private edgeD(a: ViewNode, b: ViewNode) {
    const f = (n: number) => n.toFixed(1);
    if (this.layout === 'arc') {
      const r = Math.abs(b.x - a.x) / 2 || 1;
      return `M${f(a.x)},${f(a.y)}A${f(r)},${f(r)} 0 0 ${a.x < b.x ? 1 : 0} ${f(b.x)},${f(b.y)}`;
    }
    const [cx, cy] = this.edgeCtrl(a, b);
    return `M${f(a.x)},${f(a.y)}Q${f(cx)},${f(cy)} ${f(b.x)},${f(b.y)}`;
  }

  private edgeMid(a: ViewNode, b: ViewNode): [number, number] {
    if (this.layout === 'arc')
      return [(a.x + b.x) / 2, Math.min(a.y, b.y) - Math.abs(b.x - a.x) / 2];
    const [cx, cy] = this.edgeCtrl(a, b);
    return [0.25 * a.x + 0.5 * cx + 0.25 * b.x, 0.25 * a.y + 0.5 * cy + 0.25 * b.y];
  }

  /* -------------------------------------------------------------- highlight */

  private applyHighlight() {
    const hov = this.hover && this.isLive(this.hover) ? this.hover : null;
    const sel = this.sel && this.isLive(this.sel) ? this.sel : null;
    let hn: Set<string> | null = null;
    let he: Set<number> | null = null;
    let center: string | null = null;
    const nb = (id: string) => {
      center = id;
      hn = new Set([id]);
      he = new Set();
      for (const { o, e } of this.g.neighbors(id))
        if (this.VE.has(e.i)) {
          hn.add(o);
          he.add(e.i);
        }
    };
    if (hov) nb(hov);
    else if (this.path) {
      hn = new Set(this.path);
      he = this.pathEdges();
    } else if (sel) nb(sel);
    const HN = hn as Set<string> | null;
    const HE = he as Set<number> | null;
    const C = center as string | null;
    const pidx = this.path ? new Map(this.path.map((id, i) => [id, i])) : null;
    this.V.forEach((v) => {
      const c = v.el.classList;
      c.toggle('nc-dim', !!HN && !HN.has(v.id));
      c.toggle('nc-hi', !!HN && HN.has(v.id));
      c.toggle('nc-sel', v.id === this.sel);
    });
    this.VE.forEach((ve, i) => {
      const on = !!HE && HE.has(i);
      const c = ve.el.classList;
      c.toggle('nc-hi', on);
      c.toggle('nc-dim', !!HE && !on);
      if (on) {
        const rev = C ? ve.e.b === C : (pidx?.get(ve.e.a) ?? 0) > (pidx?.get(ve.e.b) ?? 0);
        const other = C ? (ve.e.a === C ? ve.e.b : ve.e.a) : rev ? ve.e.a : ve.e.b;
        ve.el.style.setProperty('--c', this.typeVar(this.g.node(other)!.type));
        c.toggle('nc-rev', rev);
      } else c.remove('nc-rev');
    });
    const lab = HE && HE.size <= 14 ? [...HE] : [];
    const key = lab.join(',');
    if (key !== this.labKey) {
      this.labKey = key;
      this.buildEdgeLabels(lab);
    }
  }

  private buildEdgeLabels(ids: number[]) {
    this.Lel.textContent = '';
    this.elabels = [];
    ids.forEach((i) => {
      const ve = this.VE.get(i);
      if (!ve || !ve.e.label) return;
      const g = mk('g', { class: 'nc-elab' }, this.Lel);
      const r = mk('rect', { rx: 9, height: 19, y: -13 }, g);
      const t = mk('text', { y: 1 }, g);
      t.textContent = this.short(ve.e.label, 36);
      t.style.direction = textDir(ve.e.label);
      let w = ve.e.label.length * 5.5;
      try {
        if (typeof t.getComputedTextLength === 'function') w = t.getComputedTextLength() || w;
      } catch {
        /* not rendered (e.g. in tests) */
      }
      r.setAttribute('x', (-w / 2 - 8).toFixed(1));
      r.setAttribute('width', (w + 16).toFixed(1));
      this.elabels.push({ ve, g });
    });
    this.dirty = true;
  }

  /** Re-measure edge labels (call after web fonts load). */
  remeasure() {
    this.labKey = '~';
    this.applyHighlight();
  }

  /* ----------------------------------------------------------------- camera */

  private bbox(useT: boolean, list?: ViewNode[]) {
    const all = !list;
    list = list || this.live;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    list.forEach((v) => {
      const x = useT ? v.tx : v.x;
      const y = useT ? v.ty : v.y;
      x0 = Math.min(x0, x - v.r - 46);
      x1 = Math.max(x1, x + v.r + 46);
      y0 = Math.min(y0, y - v.r - 14);
      y1 = Math.max(y1, y + v.r + 34);
    });
    if (all && this.layout !== 'force' && this.Lbg.firstChild) {
      try {
        const b = this.Lbg.getBBox();
        x0 = Math.min(x0, b.x);
        y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.width);
        y1 = Math.max(y1, b.y + b.height);
      } catch {
        /* not rendered */
      }
    }
    if (all && this.layout === 'arc') {
      y1 += 120;
      let m = 0;
      this.liveE.forEach(
        ({ a, b }) => (m = Math.max(m, Math.abs((useT ? a.tx : a.x) - (useT ? b.tx : b.x)) / 2)),
      );
      y0 = Math.min(y0, -m - 12);
    }
    if (!isFinite(x0)) return { x0: -100, y0: -100, x1: 100, y1: 100 };
    return { x0, y0, x1, y1 };
  }

  private fitTo(bb: { x0: number; y0: number; x1: number; y1: number }, instant = false) {
    const { w, h } = this.size();
    const ins = this.h.insets();
    const bw = bb.x1 - bb.x0;
    const bh = bb.y1 - bb.y0;
    const aw = Math.max(80, w - ins.left - ins.right);
    const ah = Math.max(80, h - ins.top - ins.bottom);
    const k = clamp(Math.min(aw / bw, ah / bh), KMIN, 1.5);
    this.camT = {
      k,
      x: ins.left + aw / 2 - ((bb.x0 + bb.x1) / 2) * k,
      y: ins.top + ah / 2 - ((bb.y0 + bb.y1) / 2) * k,
    };
    if (instant) this.cam = { ...this.camT };
  }

  private autoFit() {
    this.follow = null;
    this.userCam = false;
    this.layoutAt = performance.now();
    this.fitTo(this.bbox(this.layout !== 'force'));
  }

  private fitIds(ids: string[]) {
    const L = ids.map((id) => this.V.get(id)).filter((v): v is ViewNode => !!v);
    if (!L.length) return;
    this.userCam = true;
    this.fitTo(this.bbox(this.layout !== 'force', L));
    if (this.layout === 'force') this.follow = { ids, until: performance.now() + 2600 };
  }

  private flyBetween(a: string, b: string) {
    const va = this.V.get(a);
    const vb = this.V.get(b);
    if (!va || !vb) return;
    const { w, h } = this.size();
    const P = (v: ViewNode) => (this.layout === 'force' ? [v.x, v.y] : [v.tx, v.ty]);
    const [ax, ay] = P(va);
    const [bx, by] = P(vb);
    const d = Math.hypot(bx - ax, by - ay);
    const k = clamp(Math.min(w, h) / (d + 300), 0.5, 1.5);
    this.camT = { k, x: w / 2 - ((ax + bx) / 2) * k, y: h / 2 - ((ay + by) / 2) * k };
    this.userCam = true;
  }

  private ensureVisible(v: ViewNode) {
    const { w, h } = this.size();
    const sx = v.x * this.cam.k + this.cam.x;
    const sy = v.y * this.cam.k + this.cam.y;
    if (sx < 80 || sx > w - 80 || sy < 80 || sy > h - 120) this.flyTo(v.id, this.camT.k);
  }

  /* ------------------------------------------------------------------- loop */

  private drawScene() {
    for (const v of this.V.values())
      v.el.setAttribute('transform', `translate(${v.x.toFixed(1)},${v.y.toFixed(1)})`);
    for (const ve of this.liveE) ve.el.setAttribute('d', this.edgeD(ve.a, ve.b));
    for (const l of this.elabels) {
      const m = this.edgeMid(l.ve.a, l.ve.b);
      l.g.setAttribute('transform', `translate(${m[0].toFixed(1)},${m[1].toFixed(1)})`);
    }
  }

  private drawCam() {
    const c = this.cam;
    this.vp.setAttribute(
      'transform',
      `translate(${c.x.toFixed(2)},${c.y.toFixed(2)}) scale(${c.k.toFixed(4)})`,
    );
    const lo = c.k < 0.42;
    if (lo !== this.lastLo) {
      this.h.svg.classList.toggle('nc-lo', lo);
      this.lastLo = lo;
    }
    const ls = Math.round(clamp(0.85 / c.k, 1, 1.7) * 20) / 20;
    if (ls !== this.lastLs) {
      this.h.svg.style.setProperty('--nc-ls', String(ls));
      this.lastLs = ls;
    }
    const z = Math.round(c.k * 100);
    if (z !== this.lastZ) {
      this.lastZ = z;
      this.h.onZoom(z);
    }
  }

  private frame(now: number) {
    if (this.destroyed) return;
    const dt = Math.min(64, now - (this.lastT || now));
    this.lastT = now;
    if (this.colorsDirty) this.readColors();
    let moved = false;
    const draggingNode = this.gesture?.type === 'node';
    if (this.layout === 'force') {
      if (this.alpha > 0.003) {
        this.forceStep();
        moved = true;
      }
    } else {
      if (
        this.layout === 'orbit' &&
        !this.reduced &&
        !this.sel &&
        !this.hover &&
        !this.path &&
        !draggingNode
      ) {
        this.ph.forEach((p, d) => (this.ph[d] = p + (dt / 1000) * (d % 2 ? 0.055 : -0.04)));
        this.orbitTargets();
      }
      const E = this.reduced ? 1 : 0.13;
      for (const v of this.live) {
        if (v.drag) continue;
        const ex = v.tx - v.x;
        const ey = v.ty - v.y;
        if (ex * ex + ey * ey > 0.02) {
          v.x += ex * E;
          v.y += ey * E;
          moved = true;
        }
      }
    }
    if (moved) this.dirty = true;
    if (this.follow) {
      if (now < this.follow.until && this.layout === 'force') {
        const L = this.follow.ids.map((id) => this.V.get(id)).filter((v): v is ViewNode => !!v);
        if (L.length) this.fitTo(this.bbox(false, L));
      } else this.follow = null;
    } else if (!this.userCam && this.layout === 'force' && moved && now - this.layoutAt < 3200)
      this.fitTo(this.bbox(false));
    const dx = this.camT.x - this.cam.x;
    const dy = this.camT.y - this.cam.y;
    const dk = this.camT.k - this.cam.k;
    if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15 || Math.abs(dk) > 0.0008) {
      const c = this.reduced ? 1 : 0.14;
      this.cam.x += dx * c;
      this.cam.y += dy * c;
      this.cam.k += dk * c;
      this.camDirty = true;
    } else if (dx || dy || dk) {
      this.cam = { ...this.camT };
      this.camDirty = true;
    }
    if (this.dirty) this.drawScene();
    if (this.camDirty) this.drawCam();
    if (this.dirty || this.camDirty || this.mmForce)
      if (++this.mmTick % 2 === 0 || this.mmForce) {
        this.drawMini();
        this.mmForce = false;
      }
    if (this.theme === 'sky') this.drawStars(now);
    this.dirty = this.camDirty = false;
    this.tourTick(now);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private tourTick(now: number) {
    const T = this.tour;
    if (!T) return;
    const p = T.playing ? (now - T.t0) / this.tourDuration : T.pausedAt;
    const bar = this.h.tourProgress();
    if (bar) bar.style.width = Math.min(100, p * 100) + '%';
    if (T.playing && p >= 1) {
      if (T.i < T.list.length - 1) this.tourGo(T.i + 1);
      else this.stopTour(true);
    }
  }

  /* ------------------------------------------------------------ stars & map */

  private readColors() {
    this.colorsDirty = false;
    if (!this.g || typeof getComputedStyle !== 'function') return;
    const cs = getComputedStyle(this.h.host);
    this.g.typeOrder.forEach(
      (k) => (this.colors[k] = cs.getPropertyValue('--nc-t-' + cssKey(k)).trim() || '#888'),
    );
    this.colors['__edge'] = cs.getPropertyValue('--nc-edge').trim() || 'rgba(0,0,0,.2)';
    this.colors['__accent'] = cs.getPropertyValue('--nc-accent').trim() || '#0a6b4f';
    this.mmForce = true;
  }

  private drawStars(t: number) {
    const c = this.sctx;
    const w = this.h.stars.width;
    const h = this.h.stars.height;
    if (!c || !w) return;
    const dpr = window.devicePixelRatio || 1;
    c.clearRect(0, 0, w, h);
    for (const s of this.starsData) {
      const a = this.reduced ? 0.8 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t / 1000) * s.s + s.p));
      let x = (s.x * w + this.cam.x * s.z * 0.05 * dpr) % w;
      if (x < 0) x += w;
      let y = (s.y * h + this.cam.y * s.z * 0.05 * dpr) % h;
      if (y < 0) y += h;
      c.globalAlpha = a * s.z;
      c.fillStyle = s.w ? '#ffe3a8' : '#ffffff';
      c.beginPath();
      c.arc(x, y, s.r * dpr, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  private drawMini() {
    const cv = this.h.minimap();
    const ctx = cv?.getContext?.('2d');
    if (!cv || !ctx || !cv.width || !this.live.length) return;
    const w = cv.width;
    const h = cv.height;
    const { w: W, h: H } = this.size();
    ctx.clearRect(0, 0, w, h);
    const bb = this.bbox(false);
    const c = this.cam;
    const v0 = [-c.x / c.k, -c.y / c.k];
    const v1 = [(W - c.x) / c.k, (H - c.y) / c.k];
    const x0 = Math.min(bb.x0, v0[0]);
    const y0 = Math.min(bb.y0, v0[1]);
    const x1 = Math.max(bb.x1, v1[0]);
    const y1 = Math.max(bb.y1, v1[1]);
    const s = Math.min((w - 16) / (x1 - x0), (h - 16) / (y1 - y0));
    const ox = (w - (x1 - x0) * s) / 2 - x0 * s;
    const oy = (h - (y1 - y0) * s) / 2 - y0 * s;
    this.mmT = { s, ox, oy };
    ctx.strokeStyle = this.colors['__edge'];
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.liveE.forEach(({ a, b }) => {
      ctx.moveTo(a.x * s + ox, a.y * s + oy);
      ctx.lineTo(b.x * s + ox, b.y * s + oy);
    });
    ctx.stroke();
    this.live.forEach((v) => {
      ctx.fillStyle = this.colors[v.n.type] || '#888';
      ctx.beginPath();
      ctx.arc(
        v.x * s + ox,
        v.y * s + oy,
        Math.max(1.8, v.r * s * (v.id === this.focus ? 1.2 : 1)),
        0,
        TAU,
      );
      ctx.fill();
    });
    ctx.strokeStyle = this.colors['__accent'];
    ctx.lineWidth = 1.5 * (window.devicePixelRatio || 1);
    ctx.strokeRect(v0[0] * s + ox, v0[1] * s + oy, (v1[0] - v0[0]) * s, (v1[1] - v0[1]) * s);
  }

  /** Center the camera on the point of the minimap under the pointer. */
  minimapJump(e: PointerEvent) {
    const cv = this.h.minimap();
    if (!cv || !this.mmT) return;
    const r = cv.getBoundingClientRect();
    const d = cv.width / (r.width || 1);
    const mx = (e.clientX - r.left) * d;
    const my = (e.clientY - r.top) * d;
    const wx = (mx - this.mmT.ox) / this.mmT.s;
    const wy = (my - this.mmT.oy) / this.mmT.s;
    const { w, h } = this.size();
    this.camT = { k: this.camT.k, x: w / 2 - wx * this.camT.k, y: h / 2 - wy * this.camT.k };
    this.cam = { ...this.camT };
    this.camDirty = true;
    this.userCam = true;
    this.follow = null;
  }

  resize() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const { w, h } = this.size();
    this.h.stars.width = Math.round(w * dpr);
    this.h.stars.height = Math.round(h * dpr);
    const mm = this.h.minimap();
    if (mm) {
      const mr = mm.getBoundingClientRect();
      mm.width = Math.round(mr.width * dpr);
      mm.height = Math.round(mr.height * dpr);
    }
    this.camDirty = true;
    this.mmForce = true;
  }

  /* --------------------------------------------------------------- pointer */

  private bindPointer() {
    const svg = this.h.svg;
    const on = <K extends keyof SVGElementEventMap>(
      el: Element,
      ev: K,
      fn: (e: SVGElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      el.addEventListener(ev, fn as EventListener, opts);
      this.cleanups.push(() => el.removeEventListener(ev, fn as EventListener, opts));
    };
    const sxy = (e: PointerEvent | WheelEvent): [number, number] => {
      const r = svg.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const toWorld = (x: number, y: number): [number, number] => [
      (x - this.cam.x) / this.cam.k,
      (y - this.cam.y) / this.cam.k,
    ];

    on(svg, 'pointerdown', (e) => {
      if (e.button > 0) return;
      this.ptrs.set(e.pointerId, sxy(e));
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (this.tour?.playing) this.pauseTour();
      if (this.ptrs.size === 2) {
        const G = this.gesture;
        if (G?.type === 'node') {
          const v = this.V.get(G.id);
          if (v) v.drag = false;
        }
        const [p, q] = [...this.ptrs.values()];
        this.gesture = {
          type: 'pinch',
          d0: Math.hypot(p[0] - q[0], p[1] - q[1]) || 1,
          k0: this.cam.k,
          w0: toWorld((p[0] + q[0]) / 2, (p[1] + q[1]) / 2),
        };
        return;
      }
      if (this.ptrs.size > 2) return;
      const g = (e.target as Element).closest?.('.nc-node') as SVGGElement | null;
      const [x, y] = this.ptrs.get(e.pointerId)!;
      this.gesture =
        g && !g.classList.contains('nc-out')
          ? { type: 'node', id: g.dataset['id']!, sx: x, sy: y, moved: false }
          : { type: 'pan', sx: x, sy: y, cx: this.cam.x, cy: this.cam.y, moved: false };
    });

    on(svg, 'pointermove', (e) => {
      const G = this.gesture;
      if (!this.ptrs.has(e.pointerId) || !G) return;
      const p = sxy(e);
      this.ptrs.set(e.pointerId, p);
      if (G.type === 'pinch') {
        if (this.ptrs.size < 2) return;
        const [a, b] = [...this.ptrs.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const k = clamp((G.k0 * d) / G.d0, KMIN, KMAX);
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        this.cam = { k, x: mx - G.w0[0] * k, y: my - G.w0[1] * k };
        this.camT = { ...this.cam };
        this.userCam = true;
        this.follow = null;
        this.camDirty = true;
        return;
      }
      if (G.type === 'none') return;
      const dx = p[0] - G.sx;
      const dy = p[1] - G.sy;
      if (!G.moved && Math.hypot(dx, dy) > 5) {
        G.moved = true;
        if (G.type === 'node') {
          const v = this.V.get(G.id);
          if (v) {
            v.drag = true;
            this.setHover(null);
          }
        }
      }
      if (!G.moved) return;
      if (G.type === 'pan') {
        this.cam.x = G.cx + dx;
        this.cam.y = G.cy + dy;
        this.camT = { ...this.cam };
        this.userCam = true;
        this.follow = null;
        this.camDirty = true;
        svg.classList.add('nc-panning');
      } else {
        const v = this.V.get(G.id);
        if (!v) return;
        const [wx, wy] = toWorld(p[0], p[1]);
        v.x = v.tx = wx;
        v.y = v.ty = wy;
        if (this.layout === 'force') {
          v.fx = wx;
          v.fy = wy;
          this.alpha = Math.max(this.alpha, 0.28);
        }
        this.dirty = true;
      }
    });

    const end = (e: PointerEvent) => {
      if (!this.ptrs.has(e.pointerId)) return;
      this.ptrs.delete(e.pointerId);
      const G = this.gesture;
      if (!G) return;
      if (G.type === 'pinch' || G.type === 'none') {
        this.gesture = this.ptrs.size ? { type: 'none' } : null;
        return;
      }
      if (G.type === 'node') {
        const v = this.V.get(G.id);
        if (G.moved) {
          if (v) {
            v.drag = false;
            if (this.layout === 'force' && v.id !== this.focus) {
              v.el.classList.add('nc-pinned');
              this.emit();
            }
          }
        } else if (e.type === 'pointerup') this.nodeTap(G.id, e);
        if (e.pointerType !== 'mouse') this.setHover(null);
      } else {
        svg.classList.remove('nc-panning');
        if (!G.moved && e.type === 'pointerup') this.bgTap();
      }
      this.gesture = null;
    };
    on(svg, 'pointerup', end);
    on(svg, 'pointercancel', end);

    on(
      svg,
      'wheel',
      (e) => {
        e.preventDefault();
        const [x, y] = sxy(e);
        const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
        const [wx, wy] = toWorld(x, y);
        const k = clamp(this.cam.k * f, KMIN, KMAX);
        this.cam = { k, x: x - wx * k, y: y - wy * k };
        this.camT = { ...this.cam };
        this.userCam = true;
        this.follow = null;
        this.camDirty = true;
      },
      { passive: false },
    );

    on(this.Lnodes, 'pointerover', (e) => {
      if (e.pointerType !== 'mouse' || this.gesture) return;
      const g = (e.target as Element).closest('.nc-node') as SVGGElement | null;
      if (g && !g.classList.contains('nc-out')) this.setHover(g.dataset['id']!);
    });
    on(this.Lnodes, 'pointerout', (e) => {
      if (e.pointerType !== 'mouse') return;
      const g = (e.target as Element).closest('.nc-node');
      if (!g || (e.relatedTarget && g.contains(e.relatedTarget as Node))) return;
      this.setHover(null);
    });
    on(this.Lnodes, 'keydown', (e) => {
      const g = (e.target as Element).closest('.nc-node') as SVGGElement | null;
      if (!g) return;
      const id = g.dataset['id']!;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (this.sel === id && id !== this.focus) this.recenter(id);
        else this.select(id);
      } else if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleExpand(id);
      }
    });
    on(this.Lnodes, 'focusin', (e) => {
      const g = (e.target as Element).closest('.nc-node') as SVGGElement | null;
      if (g?.matches(':focus-visible')) {
        const v = this.V.get(g.dataset['id']!);
        if (v) this.ensureVisible(v);
      }
    });
  }

  private nodeTap(id: string, e: PointerEvent) {
    const now = performance.now();
    if (this.pick) {
      const a = this.pick;
      this.setPick(null);
      if (a !== id) this.showPath(a, id);
      return;
    }
    if (e.shiftKey && this.sel && this.sel !== id) {
      this.showPath(this.sel, id);
      return;
    }
    if (this.lastTap.id === id && now - this.lastTap.t < 360) {
      this.lastTap = { id: null, t: 0 };
      this.toggleExpand(id);
      return;
    }
    this.lastTap = { id, t: now };
    this.select(id);
  }

  private bgTap() {
    if (this.pick) {
      this.setPick(null);
      return;
    }
    if (this.path) {
      this.clearPath();
      return;
    }
    if (this.sel) this.select(null);
  }
}
