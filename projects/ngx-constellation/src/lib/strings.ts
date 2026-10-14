import { LabelMode, LayoutName, ThemeName } from './models';

/** Every user-visible text of the component. Override any part through the `strings` input. */
export interface ConstellationStrings {
  dir: 'rtl' | 'ltr';
  num(n: number): string;
  percent(n: number): string;
  helpGlyph: string;

  searchPlaceholder: string;
  searchAria: string;
  noResults: string;
  inGraph: string;
  hiddenSteps(n: number): string;

  layoutsAria: string;
  layouts: Record<LayoutName, { label: string; description: string }>;
  themesAria: string;
  themes: Record<ThemeName, string>;

  help: string;
  helpTitle: string;
  helpRows: [string, string][];
  close: string;

  filters: string;
  stats(nodes: number, edges: number): string;
  typesHint: string;
  depth: string;
  depthSteps: [string, string, string];
  minStrength: string;
  labels: string;
  labelModes: Record<LabelMode, string>;
  unpinAll: string;

  trail: string;
  back: string;

  tourStart: string;
  tourCount(i: number, n: number): string;
  prev: string;
  next: string;
  pauseResume: string;
  stopTour: string;
  tourEnded: string;
  tourNoLinks: string;

  pickPrefix: string;
  pickSuffix: string;

  centerTag: string;
  introTitle: string;
  introTips(focusTitle: string): string[];
  relationTo(title: string): string;
  indirect(n: number): string;
  pathTitle(n: number): string;
  clearPath: string;
  centerBtn: string;
  expandBtn(n: number): string;
  collapseBtn: string;
  pathTo: string;
  pathToHint: string;
  unpin: string;
  open: string;
  links: string;
  linksCount(n: number): string;
  addToGraph: string;
  sheetCenter(title: string): string;
  strength(n: string): string;

  toastCollapsed(title: string): string;
  toastAllShown: string;
  toastExpanded(n: number, title: string): string;
  toastRecentered(title: string): string;
  toastNoPath: string;
  toastPath(n: number, a: string, b: string): string;
  toastReleased: string;
  hint: string;

  orbitDirect: string;
  orbitSteps(n: number): string;
  timeArrow: string;

  graphAria: string;
  nodeAria(title: string, type: string, isFocus: boolean, hidden: number): string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  minimap: string;
  fullscreen: string;
}

const faDigits = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export const STRINGS_FA: ConstellationStrings = {
  dir: 'rtl',
  num: faDigits,
  percent: (n) => `${faDigits(n)}٪`,
  helpGlyph: '؟',
  searchPlaceholder: 'جستجو در گراف…',
  searchAria: 'جستجوی گره',
  noResults: 'موردی پیدا نشد',
  inGraph: 'در گراف',
  hiddenSteps: (n) => `پنهان · ${faDigits(n)} گام`,
  layoutsAria: 'چیدمان گراف',
  layouts: {
    force: {
      label: 'نیرو‌محور',
      description:
        'گره‌ها مثل ذرات به هم کشیده و از هم رانده می‌شوند؛ ساختار طبیعی شبکه پیدا می‌شود.',
    },
    orbit: {
      label: 'منظومه',
      description:
        'گره مرکزی چون خورشید؛ پیوندهای مستقیم در مدار اول و دورترها در مدارهای بیرونی آرام می‌گردند.',
    },
    cluster: {
      label: 'خوشه‌ها',
      description: 'گره‌ها بر اساس نوع در خوشه‌های رنگی دسته می‌شوند؛ مرکز در میانه‌ی همه.',
    },
    timeline: { label: 'خط زمان', description: 'گره‌ها روی محور زمان؛ هر نوع در یک ردیف.' },
    arc: {
      label: 'کمانی',
      description: 'همه‌ی گره‌ها روی یک خط؛ کمان‌ها نشان می‌دهند هر گره به کدام‌ها وصل است.',
    },
  },
  themesAria: 'پوسته',
  themes: { light: 'روشن', dark: 'تیره', sky: 'آسمان شب' },
  help: 'راهنما',
  helpTitle: 'راهنمای گشت در گراف',
  helpRows: [
    ['کلیک روی گره', 'نمایش جزئیات و پیوندهای آن'],
    ['دوبار کلیک / Space', 'گسترش همسایه‌های پنهان (نشان +n)'],
    ['Enter روی گره انتخاب‌شده', 'مرکز گراف کردن آن گره'],
    ['Shift + کلیک', 'کوتاه‌ترین مسیر از گره انتخاب‌شده تا این گره'],
    ['کشیدن گره', 'جابه‌جایی (در حالت نیرو‌محور سنجاق می‌شود)'],
    ['کشیدن زمینه / چرخ موس', 'جابه‌جایی و بزرگ‌نمایی؛ در لمسی با دو انگشت'],
    ['← →', 'رفتن به پیوند بعدی/قبلی مرکز'],
    ['1 تا 5', 'تغییر چیدمان'],
    ['/ · F · T · M', 'جستجو · جا دادن · گشت خودکار · نقشه‌ی کوچک'],
    ['Backspace · Esc', 'بازگشت در مسیر کاوش · لغو انتخاب/مسیر/گشت'],
  ],
  close: 'بستن',
  filters: 'فیلتر و نمایش',
  stats: (n, e) => `${faDigits(n)} گره · ${faDigits(e)} پیوند`,
  typesHint: 'انواع (برای پنهان/نمایان کردن کلیک کنید)',
  depth: 'عمق همسایگی از مرکز',
  depthSteps: ['یک گام', 'دو گام', 'سه گام'],
  minStrength: 'حداقل قوت ارتباط',
  labels: 'برچسب‌ها',
  labelModes: { smart: 'هوشمند', all: 'همه', none: 'فقط مهم‌ها' },
  unpinAll: 'رها کردن همه‌ی گره‌های سنجاق‌شده',
  trail: 'مسیر کاوش:',
  back: 'بازگشت (Backspace)',
  tourStart: 'گشت خودکار',
  tourCount: (i, n) => `${faDigits(i)} از ${faDigits(n)}`,
  prev: 'قبلی',
  next: 'بعدی',
  pauseResume: 'توقف/ادامه',
  stopTour: 'پایان گشت (Esc)',
  tourEnded: 'گشت به پایان رسید',
  tourNoLinks: 'پیوندی برای گشت نیست',
  pickPrefix: 'مسیر از',
  pickSuffix: '— گره مقصد را انتخاب کنید',
  centerTag: 'مرکز گراف',
  introTitle: 'از اینجا شروع کنید',
  introTips: (t) => [
    `روی هر گره کلیک کنید تا ببینید چرا به «${t}» مربوط است.`,
    'نشان +n یعنی پیوندهای پنهان؛ با دوبار کلیک باز می‌شوند.',
    'چیدمان‌های بالای صفحه همین شبکه را از زاویه‌های دیگر نشان می‌دهند.',
  ],
  relationTo: (t) => `ارتباط با «${t}»`,
  indirect: (n) => `ارتباط غیرمستقیم با مرکز · ${faDigits(n)} گام`,
  pathTitle: (n) => `مسیر ${faDigits(n)} گامی`,
  clearPath: 'پاک کردن مسیر',
  centerBtn: '◎ مرکز گراف کن',
  expandBtn: (n) => `＋ گسترش ${faDigits(n)} پیوند`,
  collapseBtn: '－ جمع کردن',
  pathTo: '⤳ مسیر تا…',
  pathToHint: 'یا Shift+کلیک روی گره دیگر',
  unpin: 'رها کردن',
  open: 'مشاهده‌ی مدخل ↗',
  links: 'پیوندها',
  linksCount: (n) => `${faDigits(n)} مورد`,
  addToGraph: 'افزودن به گراف',
  sheetCenter: (t) => `مرکز: ${t}`,
  strength: (n) => `قوت ارتباط ${n}`,
  toastCollapsed: (t) => `پیوندهای «${t}» جمع شد`,
  toastAllShown: 'همه‌ی پیوندهای این گره نمایش داده شده‌اند',
  toastExpanded: (n, t) =>
    `${faDigits(n)} گره‌ی تازه از «${t}» باز شد · دوبار کلیک دوباره = جمع کردن`,
  toastRecentered: (t) => `مرکز گراف: ${t}`,
  toastNoPath: 'مسیری میان این دو پیدا نشد',
  toastPath: (n, a, b) => `مسیر ${faDigits(n)} گامی از «${a}» تا «${b}»`,
  toastReleased: 'گره‌ها آزاد شدند',
  hint: 'کلیک = جزئیات · دوبار کلیک = گسترش · Shift+کلیک = مسیر · ؟ = راهنما',
  orbitDirect: 'مدار پیوندهای مستقیم',
  orbitSteps: (n) => `مدار ${faDigits(n)} گامی`,
  timeArrow: '← گذر زمان',
  graphAria: 'گراف تعاملی؛ برای پیمایش از کلیدهای جهت‌نما استفاده کنید',
  nodeAria: (t, type, f, h) =>
    `${t} — ${type}${f ? ' (مرکز)' : ''}${h ? `، ${faDigits(h)} پیوند پنهان` : ''}`,
  zoomIn: 'بزرگ‌نمایی (+)',
  zoomOut: 'کوچک‌نمایی (−)',
  fit: 'جا دادن کل گراف (F)',
  minimap: 'نقشه‌ی کوچک (M)',
  fullscreen: 'تمام صفحه',
};

const en = (n: number | string) => String(n);

export const STRINGS_EN: ConstellationStrings = {
  dir: 'ltr',
  num: en,
  percent: (n) => `${n}%`,
  helpGlyph: '?',
  searchPlaceholder: 'Search the graph…',
  searchAria: 'Search nodes',
  noResults: 'Nothing found',
  inGraph: 'in graph',
  hiddenSteps: (n) => `hidden · ${n} step${n === 1 ? '' : 's'}`,
  layoutsAria: 'Graph layout',
  layouts: {
    force: {
      label: 'Force',
      description:
        'Nodes attract and repel like particles, revealing the natural shape of the network.',
    },
    orbit: {
      label: 'Orbit',
      description:
        'The focus is the sun; direct links orbit closest and farther ones drift on outer rings.',
    },
    cluster: {
      label: 'Clusters',
      description: 'Nodes are grouped into colored clusters by type, around the focus.',
    },
    timeline: { label: 'Timeline', description: 'Nodes on a time axis with one lane per type.' },
    arc: { label: 'Arcs', description: 'All nodes on one line; arcs show who connects to whom.' },
  },
  themesAria: 'Theme',
  themes: { light: 'Light', dark: 'Dark', sky: 'Night sky' },
  help: 'Help',
  helpTitle: 'Exploring the graph',
  helpRows: [
    ['Click a node', 'Show its details and links'],
    ['Double-click / Space', 'Expand hidden neighbours (the +n badge)'],
    ['Enter on the selected node', 'Make it the focus'],
    ['Shift + click', 'Shortest path from the selected node to this one'],
    ['Drag a node', 'Move it (pinned in the force layout)'],
    ['Drag background / wheel', 'Pan and zoom; pinch on touch'],
    ['← →', 'Next / previous link of the focus'],
    ['1 – 5', 'Switch layout'],
    ['/ · F · T · M', 'Search · fit · guided tour · minimap'],
    ['Backspace · Esc', 'Go back in the trail · clear selection/path/tour'],
  ],
  close: 'Close',
  filters: 'Filters & display',
  stats: (n, e) => `${n} nodes · ${e} links`,
  typesHint: 'Types (click to hide/show)',
  depth: 'Neighbourhood depth',
  depthSteps: ['1 step', '2 steps', '3 steps'],
  minStrength: 'Minimum link strength',
  labels: 'Labels',
  labelModes: { smart: 'Smart', all: 'All', none: 'Key only' },
  unpinAll: 'Release all pinned nodes',
  trail: 'Trail:',
  back: 'Back (Backspace)',
  tourStart: 'Guided tour',
  tourCount: (i, n) => `${i} of ${n}`,
  prev: 'Previous',
  next: 'Next',
  pauseResume: 'Pause/resume',
  stopTour: 'End tour (Esc)',
  tourEnded: 'Tour finished',
  tourNoLinks: 'No links to tour',
  pickPrefix: 'Path from',
  pickSuffix: '— pick the target node',
  centerTag: 'Focus',
  introTitle: 'Start here',
  introTips: (t) => [
    `Click any node to see why it relates to “${t}”.`,
    'A +n badge means hidden links; double-click to expand.',
    'The layouts at the top show the same network from other angles.',
  ],
  relationTo: (t) => `Relation to “${t}”`,
  indirect: (n) => `Indirect relation · ${n} steps`,
  pathTitle: (n) => `${n}-step path`,
  clearPath: 'Clear path',
  centerBtn: '◎ Make focus',
  expandBtn: (n) => `＋ Expand ${n} link${n === 1 ? '' : 's'}`,
  collapseBtn: '－ Collapse',
  pathTo: '⤳ Path to…',
  pathToHint: 'or Shift+click another node',
  unpin: 'Release',
  open: 'Open entry ↗',
  links: 'Links',
  linksCount: (n) => `${n}`,
  addToGraph: 'Add to graph',
  sheetCenter: (t) => `Focus: ${t}`,
  strength: (n) => `Strength ${n}`,
  toastCollapsed: (t) => `Collapsed “${t}”`,
  toastAllShown: 'All links of this node are already shown',
  toastExpanded: (n, t) =>
    `${n} new node${n === 1 ? '' : 's'} from “${t}” · double-click again to collapse`,
  toastRecentered: (t) => `Focus: ${t}`,
  toastNoPath: 'No path between these two',
  toastPath: (n, a, b) => `${n}-step path from “${a}” to “${b}”`,
  toastReleased: 'Nodes released',
  hint: 'Click = details · double-click = expand · Shift+click = path · ? = help',
  orbitDirect: 'direct links',
  orbitSteps: (n) => `${n} steps away`,
  timeArrow: 'time →',
  graphAria: 'Interactive graph; use the arrow keys to move between links',
  nodeAria: (t, type, f, h) =>
    `${t} — ${type}${f ? ' (focus)' : ''}${h ? `, ${h} hidden links` : ''}`,
  zoomIn: 'Zoom in (+)',
  zoomOut: 'Zoom out (−)',
  fit: 'Fit graph (F)',
  minimap: 'Minimap (M)',
  fullscreen: 'Fullscreen',
};
