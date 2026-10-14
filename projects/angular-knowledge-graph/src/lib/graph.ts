import { ConstellationData, ConstellationEdge, ConstellationNode } from './models';

export interface GNode {
  id: string;
  src: ConstellationNode;
  title: string;
  type: string;
  era: number | null;
  /** Base radius, derived from degree. */
  r0: number;
}

export interface GEdge {
  i: number;
  a: string;
  b: string;
  w: number;
  label: string;
  src: ConstellationEdge;
}

export interface GAdj {
  o: string;
  e: GEdge;
}

/** Turns any type key into a string that is safe inside a CSS custom-property name. */
export const cssKey = (k: string) =>
  k.replace(/[^a-zA-Z0-9_-]/g, (c) => '_' + c.charCodeAt(0).toString(36));

/** Immutable, indexed view of the graph data. */
export class GraphIndex {
  readonly nodes = new Map<string, GNode>();
  readonly edges: GEdge[] = [];
  readonly maxWeight: number;
  readonly typeOrder: string[];
  readonly eraRange: [number, number] | null;
  private readonly adj = new Map<string, GAdj[]>();

  constructor(data: ConstellationData, typeKeys: readonly string[] = []) {
    for (const n of data.nodes ?? []) {
      if (!n || this.nodes.has(n.id)) continue;
      this.nodes.set(n.id, {
        id: n.id,
        src: n,
        title: n.title ?? n.id,
        type: n.type ?? 'default',
        era: typeof n.era === 'number' && isFinite(n.era) ? n.era : null,
        r0: 0,
      });
      this.adj.set(n.id, []);
    }
    for (const e of data.edges ?? []) {
      if (!e || e.source === e.target || !this.nodes.has(e.source) || !this.nodes.has(e.target))
        continue;
      if (this.edgeOf(e.source, e.target)) continue;
      const ge: GEdge = {
        i: this.edges.length,
        a: e.source,
        b: e.target,
        w: e.weight ?? 1,
        label: e.label ?? '',
        src: e,
      };
      this.edges.push(ge);
      this.adj.get(ge.a)!.push({ o: ge.b, e: ge });
      this.adj.get(ge.b)!.push({ o: ge.a, e: ge });
    }
    this.nodes.forEach((n) => (n.r0 = Math.round(9 + Math.sqrt(this.adj.get(n.id)!.length) * 3.1)));
    this.maxWeight = this.edges.reduce((m, e) => Math.max(m, e.w), 1);
    const order = [...typeKeys];
    this.nodes.forEach((n) => {
      if (!order.includes(n.type)) order.push(n.type);
    });
    this.typeOrder = order;
    const eras = [...this.nodes.values()].map((n) => n.era).filter((x): x is number => x != null);
    this.eraRange = eras.length ? [Math.min(...eras), Math.max(...eras)] : null;
  }

  get size() {
    return this.nodes.size;
  }

  node(id: string): GNode | undefined {
    return this.nodes.get(id);
  }

  neighbors(id: string): readonly GAdj[] {
    return this.adj.get(id) ?? [];
  }

  edgeOf(a: string, b: string): GEdge | null {
    const x = this.adj.get(a)?.find((z) => z.o === b);
    return x ? x.e : null;
  }

  typeIndex(k: string) {
    const i = this.typeOrder.indexOf(k);
    return i < 0 ? this.typeOrder.length : i;
  }

  /** Era of a node, or the mean era of its neighbours, or null. */
  eraOf(id: string): number | null {
    const n = this.nodes.get(id);
    if (!n) return null;
    if (n.era != null) return n.era;
    const es = this.neighbors(id)
      .map((x) => this.nodes.get(x.o)!.era)
      .filter((x): x is number => x != null);
    return es.length ? es.reduce((a, b) => a + b, 0) / es.length : null;
  }

  /** The best default focus: the node with the most links. */
  defaultFocus(): string | null {
    let best: string | null = null;
    let deg = -1;
    this.nodes.forEach((n) => {
      const d = this.neighbors(n.id).length;
      if (d > deg) {
        deg = d;
        best = n.id;
      }
    });
    return best;
  }
}

/** Unweighted shortest path (BFS) over the whole graph. */
export function bfsPath(g: GraphIndex, a: string, b: string): string[] | null {
  if (!g.node(a) || !g.node(b)) return null;
  const prev = new Map<string, string | null>([[a, null]]);
  const q = [a];
  while (q.length) {
    const x = q.shift()!;
    if (x === b) break;
    for (const { o } of g.neighbors(x))
      if (!prev.has(o)) {
        prev.set(o, x);
        q.push(o);
      }
  }
  if (!prev.has(b)) return null;
  const p: string[] = [];
  for (let x: string | null = b; x != null; x = prev.get(x) ?? null) p.unshift(x);
  return p;
}

export interface VisibilityParams {
  focus: string;
  depth: number;
  expanded: Iterable<string>;
  extra: Iterable<string>;
  hiddenTypes: ReadonlySet<string>;
  minWeight: number;
}

export function passes(
  g: GraphIndex,
  id: string,
  e: GEdge,
  p: Pick<VisibilityParams, 'hiddenTypes' | 'minWeight'>,
) {
  return !p.hiddenTypes.has(g.node(id)!.type) && e.w >= p.minWeight;
}

/**
 * Which nodes are visible: everything within `depth` steps of the focus, plus the neighbours of
 * expanded nodes, plus explicitly revealed ones. The value is the node that "brought" each node in
 * (used as the spawn point of the animation).
 */
export function computeVisible(g: GraphIndex, p: VisibilityParams): Map<string, string | null> {
  const vis = new Map<string, string | null>();
  if (!g.node(p.focus)) return vis;
  vis.set(p.focus, null);
  let fr = [p.focus];
  for (let d = 0; d < p.depth; d++) {
    const nx: string[] = [];
    for (const id of fr)
      for (const { o, e } of g.neighbors(id))
        if (!vis.has(o) && passes(g, o, e, p)) {
          vis.set(o, id);
          nx.push(o);
        }
    fr = nx;
  }
  const expanded = [...p.expanded];
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of expanded)
      if (vis.has(id))
        for (const { o, e } of g.neighbors(id))
          if (!vis.has(o) && passes(g, o, e, p)) {
            vis.set(o, id);
            changed = true;
          }
  }
  for (const id of p.extra)
    if (g.node(id) && !vis.has(id)) {
      const par = g.neighbors(id).find((x) => vis.has(x.o));
      vis.set(id, par ? par.o : p.focus);
    }
  return vis;
}
