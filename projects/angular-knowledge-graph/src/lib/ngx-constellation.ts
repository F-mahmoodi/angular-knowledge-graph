import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ConstellationEngine, EngineSnapshot } from './engine';
import { GraphIndex, bfsPath, cssKey, passes } from './graph';
import {
  ConstellationData,
  ConstellationDetailContext,
  ConstellationEra,
  ConstellationExpandEvent,
  ConstellationFeatures,
  ConstellationNode,
  ConstellationType,
  DEFAULT_FEATURES,
  LabelMode,
  LayoutName,
  THEME_NAMES,
  ThemeName,
  ThemeSetting,
} from './models';
import { ConstellationStrings, STRINGS_EN, STRINGS_FA } from './strings';

let nextId = 0;

/** Colors used for types that don't define their own. */
const PALETTE = [
  { light: '#0f8f6b', dark: '#3fd0a0', sky: '#7ff0c8' },
  { light: '#d97a2b', dark: '#f2a35e', sky: '#ffbf80' },
  { light: '#3a7cc4', dark: '#6fa8ec', sky: '#8fc1ff' },
  { light: '#cf4a56', dark: '#f07a84', sky: '#ff97a0' },
  { light: '#8a5cc6', dark: '#b592ef', sky: '#cdb0ff' },
  { light: '#b38a12', dark: '#e3c25a', sky: '#ffe08a' },
  { light: '#2a8f9e', dark: '#5cc6d4', sky: '#8ae6f0' },
  { light: '#b0477f', dark: '#e27ab2', sky: '#ffa3d1' },
];

interface ResolvedType {
  key: string;
  label: string;
  light: string;
  dark: string;
  sky: string;
  /** `var(--nc-t-…)` reference for templates. */
  color: string;
  css: string;
}

interface Step {
  id: string;
  title: string;
  color: string;
  link: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ً-ْٰ‌()«»"'\s]/g, '');

/**
 * `<ngx-constellation>` — an interactive, explorable knowledge-graph viewer with five layouts,
 * three themes, a details panel, search, path finding and a guided tour.
 */
@Component({
  selector: 'ngx-constellation',
  imports: [NgTemplateOutlet],
  templateUrl: './ngx-constellation.html',
  styleUrl: './ngx-constellation.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngx-constellation',
    '[attr.data-theme]': 'resolvedTheme()',
    '[attr.dir]': 'direction()',
    '[class.nc-compact]': 'compact()',
    '[class.nc-narrow]': 'narrow()',
    '[class.nc-tiny]': 'tiny()',
    '(keydown)': 'onKey($event)',
  },
})
export class NgxConstellation {
  /* ---------------------------------------------------------------- inputs */

  /** The graph to show. */
  readonly data = input.required<ConstellationData>();
  /** Node types (labels and colors). Types found in data but missing here get automatic colors. */
  readonly types = input<ConstellationType[]>([]);
  /** Labelled ticks for the timeline axis. */
  readonly eras = input<ConstellationEra[]>([]);
  /** Built-in language: English (LTR, default) or Persian (RTL). */
  readonly locale = input<'en' | 'fa'>('en');
  /** Override any UI text. */
  readonly strings = input<Partial<ConstellationStrings> | null>(null);
  /** Text direction; defaults to the locale's direction. */
  readonly dir = input<'rtl' | 'ltr' | null>(null);
  /** Optional title shown at the start of the toolbar. */
  readonly brand = input('');
  /** Optional footnote shown at the bottom of the filters card. */
  readonly note = input('');
  /** Turn parts of the UI on or off. */
  readonly features = input<Partial<ConstellationFeatures>>({});
  /** Milliseconds per step of the guided tour. */
  readonly tourDuration = input(4800);
  /** Labels longer than this are truncated with an ellipsis. */
  readonly maxLabelLength = input(22);
  /** When set, theme and layout are remembered in localStorage under this key. */
  readonly persistKey = input<string | null>(null);
  /** Show a one-time hint about mouse gestures on start. */
  readonly showHint = input(true);
  /** Extra content rendered in the details panel for the current node. */
  readonly detailTemplate = input<TemplateRef<ConstellationDetailContext> | null>(null);

  /* ---------------------------------------------------- two-way bindings */

  /** Id of the node at the center. Defaults to the most connected node. */
  readonly focus = model<string | null>(null);
  /** Id of the selected node. */
  readonly selected = model<string | null>(null);
  readonly layout = model<LayoutName>('force');
  readonly theme = model<ThemeSetting>('auto');
  /** How many steps from the focus are shown (1–3). */
  readonly depth = model(1);
  readonly labels = model<LabelMode>('smart');

  /* --------------------------------------------------------------- outputs */

  /** Emits when the selection changes. */
  readonly nodeSelect = output<ConstellationNode | null>();
  /** Emits when the "open entry" button of a node is used. */
  readonly nodeOpen = output<ConstellationNode>();
  /** Emits when hidden neighbours of a node are expanded. */
  readonly nodeExpand = output<ConstellationExpandEvent>();
  /** Emits the highlighted path (or null when it is cleared). */
  readonly pathChange = output<ConstellationNode[] | null>();

  /* ----------------------------------------------------------------- state */

  protected readonly uid = ++nextId;
  protected engine: ConstellationEngine | null = null;
  protected readonly snap = signal<EngineSnapshot | null>(null);
  protected readonly zoom = signal(100);
  protected readonly toastMsg = signal('');
  protected readonly toastShow = signal(false);
  protected readonly compact = signal(false);
  protected readonly narrow = signal(false);
  protected readonly tiny = signal(false);
  protected readonly sheetOpen = signal(false);
  protected readonly miniOn = signal(true);
  protected readonly query = signal('');
  protected readonly qIdx = signal(0);
  protected readonly qOpen = signal(false);
  private readonly systemDark = signal(false);
  private readonly ready = signal(false);
  private lastIndex: GraphIndex | null = null;
  private lastSel: string | null = null;
  /** Last values pushed from the engine to the models (so a newer value set by the app isn't overwritten). */
  private pushed: { focus: string | null; layout: LayoutName | null; depth: number | null } = {
    focus: null,
    layout: null,
    depth: null,
  };
  private lastPathKey = '';
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private mmDown = false;

  private readonly hostEl: HTMLElement = inject(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly stageRef = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly starsRef = viewChild.required<ElementRef<HTMLCanvasElement>>('stars');
  private readonly mmRef = viewChild<ElementRef<HTMLCanvasElement>>('mm');
  private readonly tprogRef = viewChild<ElementRef<HTMLElement>>('tprog');
  private readonly filtersRef = viewChild<ElementRef<HTMLDetailsElement>>('filters');
  private readonly helpRef = viewChild<ElementRef<HTMLDialogElement>>('help');
  private readonly searchRef = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly S = computed<ConstellationStrings>(() => ({
    ...(this.locale() === 'en' ? STRINGS_EN : STRINGS_FA),
    ...(this.strings() ?? {}),
  }));
  protected readonly direction = computed(() => this.dir() ?? this.S().dir);
  protected readonly f = computed<ConstellationFeatures>(() => ({
    ...DEFAULT_FEATURES,
    ...this.features(),
  }));
  protected readonly themes = THEME_NAMES;
  protected readonly labelModes: readonly LabelMode[] = ['smart', 'all', 'none'];

  protected readonly resolvedTypes = computed<ResolvedType[]>(() => {
    const given = this.types();
    const keys = given.map((t) => t.key);
    for (const n of this.data().nodes ?? []) if (n && !keys.includes(n.type)) keys.push(n.type);
    return keys.map((key, i) => {
      const t = given.find((x) => x.key === key);
      const p = PALETTE[i % PALETTE.length];
      const light = t?.color ?? p.light;
      const dark = t?.darkColor ?? (t?.color ? t.color : p.dark);
      const sky = t?.skyColor ?? (t?.darkColor || t?.color ? dark : p.sky);
      const css = cssKey(key);
      return { key, label: t?.label ?? key, light, dark, sky, css, color: `var(--nc-t-${css})` };
    });
  });
  private readonly typeMap = computed(() => new Map(this.resolvedTypes().map((t) => [t.key, t])));
  protected readonly index = computed(
    () =>
      new GraphIndex(
        this.data(),
        this.resolvedTypes().map((t) => t.key),
      ),
  );
  protected readonly presentTypes = computed(() => {
    const g = this.index();
    const used = new Set([...g.nodes.values()].map((n) => n.type));
    return this.resolvedTypes().filter((t) => used.has(t.key));
  });
  protected readonly resolvedTheme = computed<ThemeName>(() => {
    const t = this.theme();
    return t === 'auto' ? (this.systemDark() ? 'dark' : 'light') : t;
  });

  protected readonly sheetTitle = computed(() => {
    const s = this.snap();
    if (!s) return '';
    return s.sel ? this.title(s.sel) : this.S().sheetCenter(this.title(s.focus));
  });

  protected readonly results = computed(() => {
    const q = norm(this.query());
    const s = this.snap();
    if (!q || !s) return [];
    const g = this.index();
    const S = this.S();
    return [...g.nodes.values()]
      .filter((n) => norm(n.title).includes(q))
      .sort((a, b) => +s.live.has(b.id) - +s.live.has(a.id) || a.title.length - b.title.length)
      .slice(0, 8)
      .map((n) => {
        let status = S.inGraph;
        if (!s.live.has(n.id)) {
          const p = bfsPath(g, s.focus, n.id);
          status = S.hiddenSteps(p ? p.length - 1 : 0);
        }
        return { id: n.id, title: n.title, color: this.color(n.type), status };
      });
  });

  protected readonly panel = computed(() => {
    const s = this.snap();
    const g = this.index();
    if (!s || !s.focus) return null;
    const id = s.sel ?? s.focus;
    const n = g.node(id);
    if (!n) return null;
    const S = this.S();
    const isFocus = id === s.focus;
    const edge = isFocus ? null : g.edgeOf(s.focus, id);
    const onPath = !!s.path && s.path.includes(id);
    const hidden = g
      .neighbors(id)
      .filter(({ o, e }) => !s.live.has(o) && passes(g, o, e, s)).length;
    const nbs = g
      .neighbors(id)
      .slice()
      .sort((a, b) => b.e.w - a.e.w);
    const groups = g.typeOrder
      .map((k) => ({
        key: k,
        label: this.typeLabel(k),
        color: this.color(k),
        items: nbs
          .filter((x) => g.node(x.o)!.type === k)
          .map(({ o, e }) => ({
            id: o,
            title: g.node(o)!.title,
            label: e.label,
            live: s.live.has(o),
          })),
      }))
      .filter((x) => x.items.length);
    let intro: {
      tips: string[];
      dist: { label: string; color: string; count: string; pct: number }[];
    } | null = null;
    if (!s.sel) {
      const counts = { ...s.counts };
      counts[n.type] = (counts[n.type] || 1) - 1;
      const mx = Math.max(1, ...Object.values(counts));
      intro = {
        tips: S.introTips(this.short(n.title, 18)),
        dist: g.typeOrder
          .filter((k) => counts[k] > 0)
          .map((k) => ({
            label: this.typeLabel(k),
            color: this.color(k),
            count: S.num(counts[k]),
            pct: Math.round((counts[k] / mx) * 100),
          })),
      };
    }
    return {
      id,
      node: n.src,
      title: n.title,
      typeLabel: this.typeLabel(n.type),
      color: this.color(n.type),
      isFocus,
      tags: n.src.tags ?? [],
      image: n.src.image ?? null,
      url: n.src.url ?? null,
      snippet: n.src.snippet ?? '',
      focusTitle: this.short(g.node(s.focus)!.title, 24),
      relation: edge
        ? {
            label: edge.label,
            pct: Math.round((edge.w / g.maxWeight) * 100),
            weight: S.num(edge.w),
          }
        : null,
      indirect: !isFocus && !edge && !onPath ? this.steps(bfsPath(g, s.focus, id)) : null,
      path: onPath && s.path!.length > 1 ? this.steps(s.path) : null,
      hidden,
      expanded: s.expanded.has(id),
      pinned: s.pinned.has(id) && s.layout === 'force',
      groups,
      linkCount: nbs.length,
      intro,
    };
  });

  protected readonly maxWeight = computed(() => this.index().maxWeight);

  constructor() {
    afterNextRender(() => this.init());

    effect(() => {
      const g = this.index();
      if (!this.ready()) return;
      untracked(() => {
        if (g === this.lastIndex || !this.engine) return;
        this.lastIndex = g;
        this.engine.typeLabels = new Map(this.resolvedTypes().map((t) => [t.key, t.label]));
        this.engine.setData(g, this.focus());
      });
    });
    effect(() => {
      const f = this.focus();
      if (!this.ready()) return;
      untracked(() => {
        const e = this.engine;
        if (e && f && f !== e.focus && e.g?.node(f)) e.recenter(f);
      });
    });
    effect(() => {
      const l = this.layout();
      if (this.ready()) untracked(() => this.engine?.setLayout(l));
    });
    effect(() => {
      const t = this.resolvedTheme();
      if (this.ready()) untracked(() => this.engine?.setTheme(t));
    });
    effect(() => {
      const d = this.depth();
      if (this.ready()) untracked(() => this.engine?.setDepth(d));
    });
    effect(() => {
      const m = this.labels();
      if (this.ready()) untracked(() => this.engine?.setLabels(m));
    });
    effect(() => {
      const s = this.selected();
      if (!this.ready()) return;
      untracked(() => {
        const e = this.engine;
        if (!e || s === e.sel) return;
        if (s && !e.isLive(s)) e.reveal(s);
        else e.select(s);
      });
    });
    effect(() => {
      const eras = this.eras();
      const dur = this.tourDuration();
      const max = this.maxLabelLength();
      untracked(() => {
        if (!this.engine) return;
        this.engine.eras = eras;
        this.engine.tourDuration = dur;
        this.engine.maxLabel = max;
      });
    });
    // per-type colors for the current theme, as CSS custom properties on the host
    let prevKeys: string[] = [];
    effect(() => {
      const th = this.resolvedTheme();
      const types = this.resolvedTypes();
      const st = this.hostEl.style;
      prevKeys.forEach((k) => st.removeProperty(k));
      prevKeys = [];
      const set = (k: string, v: string) => {
        st.setProperty(k, v);
        prevKeys.push(k);
      };
      set('--nc-focus-fill', `url(#nc-fg-${this.uid})`);
      set('--nc-glow', `url(#nc-glow-${this.uid})`);
      set('--nc-glow2', `url(#nc-glow2-${this.uid})`);
      for (const t of types)
        set(`--nc-t-${t.css}`, th === 'light' ? t.light : th === 'dark' ? t.dark : t.sky);
    });
    effect(() => {
      const key = this.persistKey();
      const theme = this.theme();
      const layout = this.layout();
      if (!key || !this.ready()) return;
      try {
        localStorage.setItem(`${key}:theme`, theme);
        localStorage.setItem(`${key}:layout`, layout);
      } catch {
        /* storage unavailable */
      }
    });
  }

  /* ------------------------------------------------------------- public API */

  /** Fit the whole visible graph into view. */
  fit() {
    this.engine?.fit();
  }
  zoomIn() {
    this.engine?.zoomBy(1.3);
  }
  zoomOut() {
    this.engine?.zoomBy(1 / 1.3);
  }
  /** Make a node the focus. */
  recenter(id: string) {
    this.engine?.recenter(id);
  }
  /** Select a node, revealing it (with its path from the focus) if hidden. */
  reveal(id: string) {
    this.engine?.reveal(id);
  }
  /** Highlight the shortest path between two nodes. */
  showPath(from: string, to: string) {
    this.engine?.showPath(from, to);
  }
  startTour() {
    this.engine?.startTour();
  }
  stopTour() {
    this.engine?.stopTour();
  }

  /* ------------------------------------------------------------- lifecycle */

  private init() {
    const key = this.persistKey();
    if (key) {
      try {
        const t = localStorage.getItem(`${key}:theme`) as ThemeSetting | null;
        const l = localStorage.getItem(`${key}:layout`) as LayoutName | null;
        if (t && (t === 'auto' || THEME_NAMES.includes(t))) this.theme.set(t);
        if (l && this.f().layouts.includes(l)) this.layout.set(l);
      } catch {
        /* storage unavailable */
      }
    }
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      this.systemDark.set(mq.matches);
      const onMq = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
      mq.addEventListener?.('change', onMq);
      this.destroyRef.onDestroy(() => mq.removeEventListener?.('change', onMq));
    }
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => this.measure());
      ro.observe(this.hostEl);
      this.destroyRef.onDestroy(() => ro.disconnect());
    }
    this.measure();

    const e = new ConstellationEngine({
      host: this.hostEl,
      stage: this.stageRef().nativeElement,
      svg: this.svgRef().nativeElement,
      stars: this.starsRef().nativeElement,
      minimap: () => this.mmRef()?.nativeElement ?? null,
      tourProgress: () => this.tprogRef()?.nativeElement ?? null,
      strings: () => this.S(),
      isCompact: () => this.compact(),
      insets: () => this.insets(),
      onChange: () => this.onEngineChange(),
      onToast: (m) => this.toast(m),
      onZoom: (z) => this.zoom.set(z),
      onExpand: (id, added) => {
        const n = this.index().node(id);
        if (n) this.nodeExpand.emit({ node: n.src, added });
      },
    });
    this.engine = e;
    e.eras = this.eras();
    e.tourDuration = this.tourDuration();
    e.maxLabel = this.maxLabelLength();
    e.typeLabels = new Map(this.resolvedTypes().map((t) => [t.key, t.label]));
    e.setLabels(this.labels());
    e.setTheme(this.resolvedTheme());
    e.depth = Math.min(3, Math.max(1, Math.round(this.depth())));
    e.setLayout(this.layout());
    this.lastIndex = this.index();
    e.setData(this.lastIndex, this.focus());
    const sel = this.selected();
    if (sel) e.reveal(sel);
    this.ready.set(true);

    const onDocKey = (ev: KeyboardEvent) => {
      if (!this.f().globalShortcuts || this.hostEl.contains(ev.target as Node)) return;
      this.onKey(ev);
    };
    document.addEventListener('keydown', onDocKey);
    document.fonts?.ready.then(() => this.engine?.remeasure());
    const onFs = () => setTimeout(() => this.engine?.resize(), 60);
    document.addEventListener('fullscreenchange', onFs);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('keydown', onDocKey);
      document.removeEventListener('fullscreenchange', onFs);
      clearTimeout(this.toastTimer);
      e.destroy();
      this.engine = null;
    });
    if (this.showHint() && this.f().help) setTimeout(() => this.toast(this.S().hint, 5200), 700);
  }

  private measure() {
    const w = this.hostEl.getBoundingClientRect().width;
    if (!w) return;
    const c = w < 900;
    if (c !== this.compact()) {
      this.compact.set(c);
      if (!c) this.sheetOpen.set(false);
    }
    this.narrow.set(w < 1180);
    this.tiny.set(w < 480);
  }

  private insets() {
    const compact = this.compact();
    const pad = compact ? 16 : 40;
    const ins = {
      left: pad,
      right: pad,
      top: this.f().trail || this.f().filters ? 58 : 24,
      bottom: compact ? 140 : 70,
    };
    const fd = this.filtersRef()?.nativeElement;
    if (fd?.open && !compact) {
      const st = this.stageRef().nativeElement.getBoundingClientRect();
      const r = fd.getBoundingClientRect();
      if (r.left + r.width / 2 < st.left + st.width / 2) ins.left = r.right - st.left + 16;
      else ins.right = st.right - r.left + 16;
    }
    return ins;
  }

  private onEngineChange() {
    const e = this.engine;
    if (!e) return;
    const s = e.snapshot();
    this.snap.set(s);
    const p = this.pushed;
    if (s.focus && s.focus !== p.focus) {
      p.focus = s.focus;
      if (s.focus !== this.focus()) this.focus.set(s.focus);
    }
    if (s.layout !== p.layout) {
      p.layout = s.layout;
      if (s.layout !== this.layout()) this.layout.set(s.layout);
    }
    if (s.depth !== p.depth) {
      p.depth = s.depth;
      if (s.depth !== this.depth()) this.depth.set(s.depth);
    }
    if (s.sel !== this.lastSel) {
      this.lastSel = s.sel;
      if (s.sel !== this.selected()) this.selected.set(s.sel);
      this.nodeSelect.emit(s.sel ? (this.index().node(s.sel)?.src ?? null) : null);
      if (s.sel && this.compact()) this.sheetOpen.set(true);
    }
    const pk = s.path ? s.path.join('\u0001') : '';
    if (pk !== this.lastPathKey) {
      this.lastPathKey = pk;
      this.pathChange.emit(s.path ? s.path.map((id) => this.index().node(id)!.src) : null);
    }
  }

  /* --------------------------------------------------------------- helpers */

  protected title(id: string) {
    return this.index().node(id)?.title ?? id;
  }
  protected short(s: string, n: number) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  protected color(type: string) {
    return this.typeMap().get(type)?.color ?? `var(--nc-t-${cssKey(type)})`;
  }
  protected typeLabel(type: string) {
    return this.typeMap().get(type)?.label ?? type;
  }
  private steps(p: string[] | null): Step[] | null {
    if (!p) return null;
    const g = this.index();
    return p.map((id, i) => ({
      id,
      title: g.node(id)!.title,
      color: this.color(g.node(id)!.type),
      link: i < p.length - 1 ? (g.edgeOf(id, p[i + 1])?.label ?? '') : '',
    }));
  }

  protected toast(msg: string, ms?: number) {
    this.toastMsg.set(msg);
    this.toastShow.set(true);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => this.toastShow.set(false),
      ms ?? Math.max(2600, msg.length * 45),
    );
  }

  /* ---------------------------------------------------------------- UI handlers */

  protected chooseLayout(l: LayoutName) {
    if (l === this.layout()) return;
    this.engine?.setLayout(l, true);
    this.layout.set(l);
  }

  protected chipClick(id: string, live: boolean) {
    const e = this.engine;
    if (!e) return;
    if (live) {
      e.select(id);
      e.flyTo(id);
    } else e.revealNeighbor(id);
  }

  protected hoverChip(id: string | null) {
    this.engine?.setHover(id);
  }

  protected setDepth(d: number) {
    this.engine?.setDepth(d);
    this.depth.set(d);
  }

  protected setLabels(m: LabelMode) {
    this.engine?.setLabels(m);
    this.labels.set(m);
  }

  protected onMinWeight(ev: Event, commit: boolean) {
    const v = +(ev.target as HTMLInputElement).value;
    if (commit) this.engine?.fit();
    else this.engine?.setMinWeight(v);
  }

  protected onFiltersToggle() {
    setTimeout(() => this.engine?.relayoutCamera());
  }

  protected toggleMinimap() {
    this.miniOn.update((v) => !v);
    setTimeout(() => this.engine?.resize());
  }

  protected toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.hostEl.requestFullscreen?.();
  }

  protected openHelp() {
    this.helpRef()?.nativeElement.showModal?.();
  }

  protected closeHelp() {
    this.helpRef()?.nativeElement.close?.();
  }

  protected mmPointer(ev: PointerEvent, phase: 'down' | 'move' | 'up') {
    if (phase === 'down') {
      this.mmDown = true;
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
    }
    if (phase === 'up') {
      this.mmDown = false;
      return;
    }
    if (this.mmDown) this.engine?.minimapJump(ev);
  }

  protected onQuery(v: string) {
    this.query.set(v);
    this.qIdx.set(0);
    this.qOpen.set(true);
  }

  protected onSearchKey(ev: KeyboardEvent) {
    const r = this.results();
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (r.length)
        this.qIdx.set((this.qIdx() + (ev.key === 'ArrowDown' ? 1 : -1) + r.length) % r.length);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const it = r[this.qIdx()];
      if (it) this.choose(it.id);
    } else if (ev.key === 'Escape') {
      this.query.set('');
      (ev.target as HTMLInputElement).blur();
    }
    ev.stopPropagation();
  }

  protected onSearchBlur() {
    setTimeout(() => this.qOpen.set(false), 120);
  }

  protected choose(id: string) {
    const input = this.searchRef()?.nativeElement;
    if (input) input.value = '';
    this.query.set('');
    this.qOpen.set(false);
    this.searchRef()?.nativeElement.blur();
    this.engine?.reveal(id);
  }

  /** Keyboard shortcuts (scoped to the component unless `globalShortcuts` is on). */
  protected onKey(ev: KeyboardEvent) {
    const e = this.engine;
    const tg = ev.target instanceof Element ? ev.target : null;
    if (!e || ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (
      this.helpRef()?.nativeElement.open ||
      tg?.matches('input,textarea,select,[contenteditable]')
    )
      return;
    const k = ev.key;
    const f = this.f();
    const handled = () => ev.preventDefault();
    if (k === '/' && f.search && f.toolbar) {
      handled();
      this.searchRef()?.nativeElement.focus();
    } else if (k === 'Escape') {
      if (e.tour) e.stopTour();
      else if (e.pick) e.setPick(null);
      else if (e.path) e.clearPath();
      else if (e.sel) e.select(null);
    } else if (k.length === 1 && 'fFب'.includes(k)) {
      handled();
      e.fit();
    } else if (k.length === 1 && 'tTف'.includes(k) && f.tour) {
      handled();
      if (e.tour) e.stopTour();
      else e.startTour();
    } else if (k.length === 1 && 'mMپ'.includes(k) && f.minimap) {
      handled();
      this.toggleMinimap();
    } else if ((k === '?' || k === '؟') && f.help) {
      handled();
      this.openHelp();
    } else if (k === '+' || k === '=') {
      handled();
      e.zoomBy(1.3);
    } else if (k === '-' || k === '_') {
      handled();
      e.zoomBy(1 / 1.3);
    } else if (/^[1-9۱-۹]$/.test(k)) {
      const i = ('123456789'.indexOf(k) + 1 || '۱۲۳۴۵۶۷۸۹'.indexOf(k) + 1) - 1;
      const l = f.layouts[i];
      if (l) {
        handled();
        this.chooseLayout(l);
      }
    } else if (k === 'Backspace') {
      handled();
      e.goBack();
    } else if ((k === 'ArrowRight' || k === 'ArrowLeft') && !tg?.closest('.nc-seg')) {
      handled();
      e.cycle(k === 'ArrowRight' ? 1 : -1);
    } else if (k === 'Enter' && e.sel && !tg?.closest('button,a,.nc-node')) {
      handled();
      e.recenter(e.sel);
    }
  }
}
