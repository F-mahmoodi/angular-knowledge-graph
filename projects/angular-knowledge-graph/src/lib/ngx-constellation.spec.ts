import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConstellationData, ConstellationNode } from './models';
import { NgxConstellation } from './ngx-constellation';

const DATA: ConstellationData = {
  nodes: [
    { id: 'sun', title: 'Sun', type: 'star' },
    { id: 'earth', title: 'Earth', type: 'planet', snippet: 'Third planet' },
    { id: 'mars', title: 'Mars', type: 'planet' },
    { id: 'moon', title: 'Moon', type: 'moon' },
  ],
  edges: [
    { source: 'sun', target: 'earth', weight: 5, label: 'orbits' },
    { source: 'sun', target: 'mars', weight: 3, label: 'orbits' },
    { source: 'earth', target: 'moon', weight: 4, label: 'satellite' },
  ],
};

@Component({
  imports: [NgxConstellation],
  template: `
    <ngx-constellation
      style="height: 600px; width: 1200px"
      [data]="data"
      locale="en"
      [showHint]="false"
      [(focus)]="focus"
      [(selected)]="selected"
      (nodeSelect)="picked = $event"
    />
  `,
})
class Host {
  data = DATA;
  focus = signal<string | null>(null);
  selected = signal<string | null>(null);
  picked: ConstellationNode | null = null;
}

const settle = async (fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) => {
  for (let i = 0; i < 3; i++) {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  }
};

describe('NgxConstellation', () => {
  beforeAll(() => {
    // jsdom has no canvas implementation
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('renders the focus and its neighbours', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const nodes = [...el.querySelectorAll('.nc-node')].map((n) => n.getAttribute('data-id')).sort();
    expect(nodes).toEqual(['earth', 'mars', 'sun']);
    expect(fixture.componentInstance.focus()).toBe('sun');
    expect(el.querySelector('.nc-panel h2')?.textContent).toContain('Sun');
  });

  it('syncs selection both ways and emits nodeSelect', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.componentInstance.selected.set('earth');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.nc-panel h2')?.textContent).toContain('Earth');
    expect(el.querySelector('.nc-relbox p')?.textContent).toContain('orbits');
    expect(fixture.componentInstance.picked?.id).toBe('earth');
  });

  it('reveals a hidden node when it is selected', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.componentInstance.selected.set('moon');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.nc-node[data-id="moon"]')).not.toBeNull();
    expect(el.querySelectorAll('.nc-path li').length).toBe(3);
  });

  it('recenters when the focus input changes', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.componentInstance.focus.set('earth');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.nc-node.nc-focus')?.getAttribute('data-id')).toBe('earth');
    expect(el.querySelector('.nc-node[data-id="moon"]:not(.nc-out)')).not.toBeNull();
  });
});
