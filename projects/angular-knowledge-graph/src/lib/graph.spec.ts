import { GraphIndex, bfsPath, computeVisible, cssKey } from './graph';
import { ConstellationData } from './models';

const data: ConstellationData = {
  nodes: [
    { id: 'a', title: 'A', type: 'x', era: 1 },
    { id: 'b', title: 'B', type: 'x', era: 3 },
    { id: 'c', title: 'C', type: 'y' },
    { id: 'd', title: 'D', type: 'y' },
    { id: 'e', title: 'E', type: 'z' },
    { id: 'lonely', title: 'Lonely', type: 'z' },
  ],
  edges: [
    { source: 'a', target: 'b', weight: 5, label: 'ab' },
    { source: 'a', target: 'c', weight: 2 },
    { source: 'b', target: 'd', weight: 8 },
    { source: 'd', target: 'e' },
    { source: 'b', target: 'a', weight: 9 }, // duplicate (reverse) — ignored
    { source: 'a', target: 'missing' }, // dangling — ignored
    { source: 'c', target: 'c' }, // self loop — ignored
  ],
};

const params = (over: Partial<Parameters<typeof computeVisible>[1]> = {}) => ({
  focus: 'a',
  depth: 1,
  expanded: [] as string[],
  extra: [] as string[],
  hiddenTypes: new Set<string>(),
  minWeight: 0,
  ...over,
});

describe('GraphIndex', () => {
  const g = new GraphIndex(data, ['y']);

  it('indexes nodes and drops invalid edges', () => {
    expect(g.size).toBe(6);
    expect(g.edges.length).toBe(4);
    expect(g.edgeOf('b', 'a')?.w).toBe(5);
    expect(g.edgeOf('a', 'missing')).toBeNull();
  });

  it('keeps the given type order first, then discovered types', () => {
    expect(g.typeOrder).toEqual(['y', 'x', 'z']);
  });

  it('defaults edge weight to 1 and computes the max weight', () => {
    expect(g.edgeOf('d', 'e')?.w).toBe(1);
    expect(g.maxWeight).toBe(8);
  });

  it('derives an era from neighbours when a node has none', () => {
    expect(g.eraOf('a')).toBe(1);
    expect(g.eraOf('c')).toBe(1);
    expect(g.eraOf('d')).toBe(3);
    expect(g.eraOf('lonely')).toBeNull();
    expect(g.eraRange).toEqual([1, 3]);
  });

  it('picks the most connected node as default focus', () => {
    expect(['a', 'b']).toContain(g.defaultFocus());
  });
});

describe('bfsPath', () => {
  const g = new GraphIndex(data);

  it('finds the shortest path', () => {
    expect(bfsPath(g, 'c', 'e')).toEqual(['c', 'a', 'b', 'd', 'e']);
    expect(bfsPath(g, 'a', 'a')).toEqual(['a']);
  });

  it('returns null when unreachable or unknown', () => {
    expect(bfsPath(g, 'a', 'lonely')).toBeNull();
    expect(bfsPath(g, 'a', 'nope')).toBeNull();
  });
});

describe('computeVisible', () => {
  const g = new GraphIndex(data);
  const ids = (m: Map<string, string | null>) => [...m.keys()].sort();

  it('shows the focus and its neighbours at depth 1', () => {
    expect(ids(computeVisible(g, params()))).toEqual(['a', 'b', 'c']);
  });

  it('goes further with more depth', () => {
    expect(ids(computeVisible(g, params({ depth: 2 })))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(computeVisible(g, params({ depth: 3 })))).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('adds neighbours of expanded nodes, transitively', () => {
    expect(ids(computeVisible(g, params({ expanded: ['b', 'd'] })))).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('records which node brought each node in', () => {
    const v = computeVisible(g, params({ expanded: ['b'] }));
    expect(v.get('a')).toBeNull();
    expect(v.get('d')).toBe('b');
  });

  it('filters by type and by minimum weight, but never hides the focus', () => {
    expect(ids(computeVisible(g, params({ hiddenTypes: new Set(['y', 'x']) })))).toEqual(['a']);
    expect(ids(computeVisible(g, params({ minWeight: 3 })))).toEqual(['a', 'b']);
  });

  it('always includes explicitly revealed nodes', () => {
    expect(ids(computeVisible(g, params({ extra: ['e', 'lonely'] })))).toEqual([
      'a',
      'b',
      'c',
      'e',
      'lonely',
    ]);
  });

  it('returns nothing for an unknown focus', () => {
    expect(computeVisible(g, params({ focus: 'nope' })).size).toBe(0);
  });
});

describe('cssKey', () => {
  it('keeps safe keys and escapes the rest', () => {
    expect(cssKey('pro')).toBe('pro');
    expect(cssKey('a b')).not.toContain(' ');
    expect(cssKey('پیامبر')).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});

describe('textDir', () => {
  it('detects the direction from the first strong character', async () => {
    const { textDir } = await import('./engine');
    expect(textDir('سلام (دنیا)')).toBe('rtl');
    expect(textDir('(1) سلام')).toBe('rtl');
    expect(textDir('Noah')).toBe('ltr');
    expect(textDir('Hello — سلام')).toBe('ltr');
    expect(textDir('123')).toBe('ltr');
  });
});
