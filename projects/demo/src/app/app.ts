import { Component, signal } from '@angular/core';
import { ConstellationStrings, LayoutName, NgxConstellation } from 'angular-knowledge-graph';
import { COMPUTING_GRAPH, ERAS, TYPES } from './data';

/** Add `?lang=fa` to the URL to see the Persian / right-to-left UI. */
const lang: 'en' | 'fa' =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang') === 'fa'
    ? 'fa'
    : 'en';

@Component({
  selector: 'app-root',
  imports: [NgxConstellation],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly data = COMPUTING_GRAPH;
  protected readonly types = TYPES;
  protected readonly eras = ERAS;
  protected readonly lang = lang;
  protected readonly focus = signal<string | null>('turing');
  protected readonly layout = signal<LayoutName>('force');
  protected readonly strings: Partial<ConstellationStrings> = {
    open: lang === 'fa' ? 'ویکی‌پدیا ↗' : 'Wikipedia ↗',
  };
  protected readonly brand = lang === 'fa' ? 'تاریخ رایانش' : 'History of computing';
  protected readonly note =
    lang === 'fa'
      ? 'داده‌ی نمونه: گراف کوچکی از تاریخ رایانش؛ هر گره به مقاله‌ی ویکی‌پدیای خودش پیوند دارد.'
      : 'Sample data: a small knowledge graph of the history of computing. Every node links to its Wikipedia article.';

  constructor() {
    if (lang === 'fa' && typeof document !== 'undefined') {
      document.documentElement.lang = 'fa';
      document.documentElement.dir = 'rtl';
    }
  }
}
