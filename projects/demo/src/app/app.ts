import { Component, signal } from '@angular/core';
import { LayoutName, NgxConstellation } from 'ngx-constellation';
import { ERAS, NOAH_GRAPH, TYPES } from './data';

/** Add `?lang=en` to the URL to see the English / left-to-right UI. */
const lang: 'fa' | 'en' =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang') === 'en'
    ? 'en'
    : 'fa';

@Component({
  selector: 'app-root',
  imports: [NgxConstellation],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly data = NOAH_GRAPH;
  protected readonly types = TYPES;
  protected readonly eras = ERAS;
  protected readonly lang = lang;
  protected readonly focus = signal<string | null>('noah');
  protected readonly layout = signal<LayoutName>('force');
  protected readonly brand = lang === 'en' ? 'Nojoom · knowledge graph' : 'نجوم · گشت در گراف دانش';
  protected readonly note =
    lang === 'en'
      ? 'The 12 direct links of «نوح (قرآن)» come from the public Nojoom API; the other nodes and links are samples.'
      : '۱۲ پیوند مستقیمِ «نوح (قرآن)» داده‌ی واقعی API نجوم است؛ باقی گره‌ها و پیوندها برای نمایش امکانات، نمونه‌اند.';

  constructor() {
    if (lang === 'en' && typeof document !== 'undefined') {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  }
}
