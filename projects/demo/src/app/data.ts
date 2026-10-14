import { ConstellationData, ConstellationEra, ConstellationType } from 'angular-knowledge-graph';

/**
 * Sample data around the entry «نوح (قرآن)» of the Nojoom encyclopedia.
 * The 12 direct links of «نوح (قرآن)» tagged «مدخل واقعی» come from the public Nojoom API;
 * the other nodes and links are illustrative samples.
 */
export const TYPES: ConstellationType[] = [
  {
    key: 'pro',
    label: 'پیامبران و اولیا',
    color: '#0f8f6b',
    darkColor: '#3fd0a0',
    skyColor: '#7ff0c8',
  },
  {
    key: 'fam',
    label: 'خاندان و خویشان',
    color: '#d97a2b',
    darkColor: '#f2a35e',
    skyColor: '#ffbf80',
  },
  {
    key: 'book',
    label: 'کتاب‌ها و سوره‌ها',
    color: '#3a7cc4',
    darkColor: '#6fa8ec',
    skyColor: '#8fc1ff',
  },
  {
    key: 'evt',
    label: 'رویدادها و نمادها',
    color: '#cf4a56',
    darkColor: '#f07a84',
    skyColor: '#ff97a0',
  },
  {
    key: 'con',
    label: 'مفاهیم و عنوان‌ها',
    color: '#8a5cc6',
    darkColor: '#b592ef',
    skyColor: '#cdb0ff',
  },
  { key: 'place', label: 'مکان‌ها', color: '#b38a12', darkColor: '#e3c25a', skyColor: '#ffe08a' },
];

export const ERAS: ConstellationEra[] = [
  { value: 0, label: 'آدم' },
  { value: 1, label: 'ادریس' },
  { value: 2, label: 'نوح و طوفان' },
  { value: 3.5, label: 'ابراهیم' },
  { value: 4.5, label: 'موسی' },
  { value: 5.5, label: 'عیسی' },
  { value: 6.6, label: 'پیامبر خاتم (ص)' },
  { value: 7.6, label: 'عصر غیبت' },
];

export const NOAH_GRAPH: ConstellationData = {
  nodes: [
    {
      id: 'noah',
      title: 'نوح (قرآن)',
      type: 'pro',
      era: 2,
      snippet:
        'حضرت نوح (ع)، که نامش چهل و سه بار در بیست و هشت سوره‌ی قرآن آمده و یک سوره به نام اوست، نخستین پیامبر اولوالعزم است؛ نخستین پیامبری که در زمان رسالتش عذاب الهی به صورت طوفانی فراگیر نازل شد.',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn892452844555',
      },
    },
    {
      id: 'adam',
      title: 'حضرت آدم (ع)',
      type: 'pro',
      era: 0,
      snippet:
        'حضرت آدم (ع)، نخستین انسان و پدر تمامی نسل‌های بشر، جایگاهی بس رفیع و محوری در اندیشه اسلامی دارد. او نه تنها اولین پیامبر الهی بود…',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn235188834903',
      },
    },
    {
      id: 'ibrahim',
      title: 'ابراهیم (پیامبر)',
      type: 'pro',
      era: 3.5,
      snippet:
        'حضرت ابراهیم (ع)، ملقب به خلیل‌الله و ابوالانبیاء، یکی از پیامبران اولوالعزم و صاحب شریعت است…',
      image:
        'https://nojoom.najm.ac/images/qn290/qn290050006951/https___commons.wikishia.net_images_thumb_9_95_مزار_حضرت_ابراهیم_-_فلسطین.jpg_300px-مزار_حضرت_ابراهیم_-_فلسطین.jpg',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn290050006951',
      },
    },
    {
      id: 'surah_nuh',
      title: 'نوح (سوره)',
      type: 'book',
      snippet:
        'سوره نوح، هفتاد و یکمین سوره از قرآن کریم و از سوره‌های مکی است که در جزء بیست و نهم جای گرفته است…',
      image:
        'https://nojoom.najm.ac/images/qn367/qn367690311727/https___commons.wikishia.net_images_7_79_سوره_نوح.jpg',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn367690311727',
      },
    },
    {
      id: 'sam',
      title: 'سام پسر نوح',
      type: 'fam',
      era: 2.3,
      snippet:
        'سام، که در برخی منابع با املای «شِم» نیز آمده است، یکی از پسران حضرت نوح (ع) است که نام او در تورات و روایات اسلامی ذکر شده است…',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn385160881583',
      },
    },
    {
      id: 'idris',
      title: 'حضرت ادریس علیه السلام',
      type: 'pro',
      era: 1,
      snippet:
        'حضرت ادریس (ع) از پیامبران بزرگ الهی است که در قرآن کریم به عنوان پیامبری راستگو، صابر و صالح با منزلتی والا یاد شده است…',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn692751716905',
      },
    },
    {
      id: 'ulul',
      title: 'اولو العزم',
      type: 'con',
      snippet:
        'مفهوم «اولوا العزم» یکی از اصطلاحات کلیدی در معارف اسلامی است که به گروه خاصی از پیامبران الهی اطلاق می‌شود…',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn737073864856',
      },
    },
    {
      id: 'torah',
      title: 'تورات',
      type: 'book',
      era: 4.6,
      snippet:
        'تورات، کتاب مقدس یهودیان و مسیحیان، از منظر اسلامی به عنوان یکی از کتب آسمانی نازل شده بر حضرت موسی (ع) و بنی‌اسرائیل شناخته می‌شود…',
      image:
        'https://nojoom.najm.ac/images/qn740/qn740811492081/https___wiki.ahlolbait.com_images_7_7d_Torah.jpg',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn740811492081',
      },
    },
    {
      id: 'khatam',
      title: 'پیامبر خاتم (ص)',
      type: 'pro',
      era: 6.5,
      snippet:
        'پیامبر اکرم حضرت محمد بن عبدالله (ص)، خاتم‌الانبیاء و آخرین فرستاده الهی، در سال عام‌الفیل (۵۷۰ میلادی) در شهر مکه چشم به جهان گشود…',
      image:
        'https://nojoom.najm.ac/images/qn861/qn861568929661/https___commons.wikishia.net_images_c_c3_مسجد_النبی_(مدینه).jpg',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn861568929661',
      },
    },
    {
      id: 'ali',
      title: 'امیر المومنین (ع)',
      type: 'pro',
      era: 6.9,
      snippet:
        'امیرالمؤمنین علی بن ابی‌طالب (ع)، امام اول شیعیان و چهارمین خلیفه از خلفای راشدین نزد اهل سنت، شخصیتی بی‌نظیر در تاریخ اسلام است…',
      image:
        'https://nojoom.najm.ac/images/qn908/qn908193776377/https___commons.wikishia.net_images_thumb_1_1b_Shahadat_emam_ali.jpg_250px-Shahadat_emam_ali.jpg',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn908193776377',
      },
    },
    {
      id: 'allah',
      title: 'خدا (واژه)',
      type: 'con',
      snippet:
        'مفهوم «خدا» یا «الله» به عنوان آفریننده هستی و کامل‌ترین موجود، محور اصلی بسیاری از ادیان، به ویژه ادیان ابراهیمی، است…',
      image:
        'https://nojoom.najm.ac/images/qn923/qn923781180387/https___commons.wikishia.net_images_thumb_8_83_تصویر_الله_بر_ضریح.jpg_1200px-تصویر_الله_بر_ضریح.jpg',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn923781180387',
      },
    },
    {
      id: 'ark',
      title: 'کشتی نوح',
      type: 'evt',
      era: 2.2,
      snippet:
        'کشتی نوح، نمادی از نجات الهی و استقامت در برابر کفر، بنایی عظیم بود که به فرمان پروردگار و با هدایت مستقیم او توسط حضرت نوح (ع) ساخته شد…',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn948445150042',
      },
    },
    {
      id: 'quran',
      title: 'قرآن',
      type: 'book',
      era: 6.6,
      snippet:
        'قرآن کریم، کتاب آسمانی و معجزه جاودان پیامبر اسلام حضرت محمد مصطفی (ص)، مجموعه‌ای از کلام الهی است که از طریق وحی نازل شده است…',
      image:
        'https://nojoom.najm.ac/images/qn981/qn981235043577/https___commons.wikishia.net_images_thumb_2_2a_Manuscripts_of_Quran_that_been_said_it_been_written_by_Imam_Hassan,.jpg_350px-Manuscripts_of_Quran_that_been_said_it_been_written_by_Imam_Hassan,.jpg',
      tags: ['مدخل واقعی'],
      data: {
        nojoomId: 'qn981235043577',
      },
    },
    {
      id: 'hud_s',
      title: 'سوره هود',
      type: 'book',
      snippet:
        'یازدهمین سوره‌ی قرآن و از سوره‌های مکی؛ مفصل‌ترین روایت قرآنی از دعوت نوح، ساخت کشتی و طوفان در آن آمده است.',
      tags: ['نمونه'],
    },
    {
      id: 'flood',
      title: 'طوفان نوح',
      type: 'evt',
      era: 2.25,
      snippet:
        'عذاب فراگیری که پس از نهصد و پنجاه سال دعوت، قوم نوح را فرا گرفت و جز سرنشینان کشتی همه غرق شدند.',
      tags: ['نمونه'],
    },
    {
      id: 'judi',
      title: 'کوه جودی',
      type: 'place',
      snippet:
        'کوهی که به تصریح آیه‌ی ۴۴ سوره‌ی هود، کشتی نوح پس از فرونشستن طوفان بر آن قرار گرفت.',
      tags: ['نمونه'],
    },
    {
      id: 'najaf',
      title: 'نجف',
      type: 'place',
      snippet:
        'شهری در عراق و مدفن امیرالمؤمنین (ع)؛ بنابر روایات، حضرت آدم و حضرت نوح نیز در کنار ایشان مدفون‌اند.',
      tags: ['نمونه'],
    },
    {
      id: 'kufa',
      title: 'کوفه',
      type: 'place',
      snippet:
        'شهری در عراق که بنابر روایات، کشتی نوح در محل مسجد آن ساخته شد و آب طوفان از تنور آن جوشید.',
      tags: ['نمونه'],
    },
    {
      id: 'ham',
      title: 'حام پسر نوح',
      type: 'fam',
      era: 2.3,
      snippet:
        'یکی از سه پسر نوح که همراه پدر سوار کشتی شد و نسل‌هایی از بشر به او نسبت داده می‌شوند.',
      tags: ['نمونه'],
    },
    {
      id: 'yafeth',
      title: 'یافث پسر نوح',
      type: 'fam',
      era: 2.3,
      snippet: 'یکی از سه پسر نوح که پس از طوفان، نسل بشر از او و برادرانش ادامه یافت.',
      tags: ['نمونه'],
    },
    {
      id: 'kanaan',
      title: 'کنعان پسر نوح',
      type: 'fam',
      era: 2.2,
      snippet:
        'پسری از نوح که به دعوت پدر برای سوار شدن بر کشتی پاسخ نداد و در طوفان غرق شد (هود ۴۲–۴۳).',
      tags: ['نمونه'],
    },
    {
      id: 'wife',
      title: 'همسر نوح',
      type: 'fam',
      era: 2.1,
      snippet: 'قرآن در سوره‌ی تحریم، همسر نوح را در کنار همسر لوط مثالی برای کافران آورده است.',
      tags: ['نمونه'],
    },
    {
      id: 'idols',
      title: 'بت‌های قوم نوح',
      type: 'evt',
      era: 1.9,
      snippet:
        'ود، سواع، یغوث، یعوق و نسر؛ بت‌هایی که قوم نوح می‌پرستیدند و نامشان در آیه‌ی ۲۳ سوره‌ی نوح آمده است.',
      tags: ['نمونه'],
    },
    {
      id: 'shaykh',
      title: 'شیخ الانبیاء',
      type: 'con',
      snippet:
        'لقب حضرت نوح، به سبب عمر بسیار طولانی او که در روایات شیعی تا ۲۵۰۰ سال نیز ذکر شده است.',
      tags: ['نمونه'],
    },
    {
      id: 'longlife',
      title: 'طول عمر',
      type: 'con',
      snippet:
        'عمر طولانی نوح یکی از شواهدی است که برای امکان عمر طولانی امام زمان (عج) به آن استناد می‌شود.',
      tags: ['نمونه'],
    },
    {
      id: 'tawhid',
      title: 'توحید',
      type: 'con',
      snippet: 'یگانه‌پرستی؛ محور دعوت همه‌ی پیامبران و پیام اصلی نوح به قومش.',
      tags: ['نمونه'],
    },
    {
      id: 'azab',
      title: 'عذاب الهی',
      type: 'con',
      snippet:
        'کیفر الهی برای اقوامی که بر تکذیب پیامبران پافشاری کردند؛ طوفان نوح نخستین نمونه‌ی فراگیر آن است.',
      tags: ['نمونه'],
    },
    {
      id: 'mahdi',
      title: 'امام زمان (عج)',
      type: 'pro',
      era: 7.6,
      snippet: 'دوازدهمین امام شیعیان؛ عمر طولانی ایشان در منابع کلامی با عمر نوح سنجیده شده است.',
      tags: ['نمونه'],
    },
    {
      id: 'ahlulbayt',
      title: 'اهل بیت (ع)',
      type: 'pro',
      era: 7,
      snippet: 'خاندان پیامبر خاتم (ص)؛ در حدیث سفینه به کشتی نوح تشبیه شده‌اند.',
      tags: ['نمونه'],
    },
    {
      id: 'safina',
      title: 'حدیث سفینه',
      type: 'con',
      snippet:
        '«مَثَل اهل بیت من، مَثَل کشتی نوح است؛ هر که بر آن نشست نجات یافت و هر که از آن بازماند غرق شد.»',
      tags: ['نمونه'],
    },
    {
      id: 'hud_p',
      title: 'هود (پیامبر)',
      type: 'pro',
      era: 2.7,
      snippet: 'پیامبری که پس از نوح بر قوم عاد مبعوث شد؛ سوره‌ی یازدهم قرآن به نام اوست.',
      tags: ['نمونه'],
    },
    {
      id: 'musa',
      title: 'موسی (پیامبر)',
      type: 'pro',
      era: 4.5,
      snippet: 'پیامبر اولوالعزم بنی‌اسرائیل که تورات بر او نازل شد.',
      tags: ['نمونه'],
    },
    {
      id: 'isa',
      title: 'عیسی (پیامبر)',
      type: 'pro',
      era: 5.5,
      snippet: 'پیامبر اولوالعزم و صاحب انجیل.',
      tags: ['نمونه'],
    },
    {
      id: 'ismail',
      title: 'اسماعیل (پیامبر)',
      type: 'pro',
      era: 3.7,
      snippet: 'فرزند ابراهیم که همراه پدر کعبه را بنا کرد.',
      tags: ['نمونه'],
    },
    {
      id: 'kaaba',
      title: 'کعبه',
      type: 'place',
      snippet: 'خانه‌ی خدا در مکه که ابراهیم و اسماعیل آن را بنا کردند.',
      tags: ['نمونه'],
    },
    {
      id: 'mecca',
      title: 'مکه',
      type: 'place',
      snippet: 'زادگاه پیامبر خاتم (ص) و جایگاه کعبه.',
      tags: ['نمونه'],
    },
    {
      id: 'fire',
      title: 'آتش نمرود',
      type: 'evt',
      era: 3.55,
      snippet: 'آتشی که ابراهیم را در آن افکندند و به فرمان خدا بر او سرد و سلامت شد (انبیاء ۶۹).',
      tags: ['نمونه'],
    },
    {
      id: 'hawwa',
      title: 'حوا',
      type: 'fam',
      era: 0,
      snippet: 'همسر حضرت آدم و مادر نسل بشر.',
      tags: ['نمونه'],
    },
    {
      id: 'habil',
      title: 'هابیل',
      type: 'fam',
      era: 0.3,
      snippet: 'فرزند آدم که قربانی‌اش پذیرفته شد و به دست برادرش قابیل کشته شد.',
      tags: ['نمونه'],
    },
    {
      id: 'injil',
      title: 'انجیل',
      type: 'book',
      era: 5.6,
      snippet: 'کتاب آسمانی نازل‌شده بر حضرت عیسی (ع).',
      tags: ['نمونه'],
    },
    {
      id: 'nahj',
      title: 'نهج البلاغه',
      type: 'book',
      era: 7.1,
      snippet: 'گزیده‌ی خطبه‌ها، نامه‌ها و حکمت‌های امیرالمؤمنین (ع) به گردآوری سید رضی.',
      tags: ['نمونه'],
    },
  ],
  edges: [
    {
      source: 'noah',
      target: 'adam',
      weight: 18,
      label: 'نوح از نوادگان نهم آدم است',
    },
    {
      source: 'noah',
      target: 'quran',
      weight: 18,
      label: 'نام نوح ۴۳ بار در ۲۸ سوره‌ی قرآن آمده',
    },
    {
      source: 'noah',
      target: 'torah',
      weight: 13,
      label: 'داستان نوح در سفر پیدایش تورات',
    },
    {
      source: 'noah',
      target: 'sam',
      weight: 10,
      label: 'سام، پسر نوح',
    },
    {
      source: 'noah',
      target: 'allah',
      weight: 10,
      label: 'دعوت نوح به پرستش خدای یگانه',
    },
    {
      source: 'noah',
      target: 'ark',
      weight: 10,
      label: 'کشتی‌ای که نوح به فرمان خدا ساخت',
    },
    {
      source: 'noah',
      target: 'ulul',
      weight: 9,
      label: 'نوح نخستین پیامبر اولوالعزم است',
    },
    {
      source: 'noah',
      target: 'khatam',
      weight: 9,
      label: 'هر دو از پیامبران اولوالعزم',
    },
    {
      source: 'noah',
      target: 'ibrahim',
      weight: 8,
      label: '«و از پیروان او ابراهیم بود» (صافات ۸۳)',
    },
    {
      source: 'noah',
      target: 'ali',
      weight: 8,
      label: 'مدفون در کنار هم در نجف، بنابر روایات',
    },
    {
      source: 'noah',
      target: 'surah_nuh',
      weight: 7,
      label: 'سوره‌ای که به نام نوح است',
    },
    {
      source: 'noah',
      target: 'idris',
      weight: 7,
      label: 'ادریس از نیاکان نوح است',
    },
    {
      source: 'noah',
      target: 'flood',
      weight: 9,
      label: 'عذاب فراگیر قوم نوح',
    },
    {
      source: 'noah',
      target: 'longlife',
      weight: 7,
      label: '۹۵۰ سال دعوت؛ عمر تا ۲۵۰۰ سال در روایات',
    },
    {
      source: 'noah',
      target: 'tawhid',
      weight: 7,
      label: 'پیام محوری دعوت نوح',
    },
    {
      source: 'noah',
      target: 'hud_s',
      weight: 6,
      label: 'مفصل‌ترین روایت داستان نوح',
    },
    {
      source: 'noah',
      target: 'kanaan',
      weight: 6,
      label: 'پسری که سوار کشتی نشد',
    },
    {
      source: 'noah',
      target: 'idols',
      weight: 6,
      label: 'معبودانی که نوح با پرستش آن‌ها مبارزه کرد',
    },
    {
      source: 'noah',
      target: 'shaykh',
      weight: 6,
      label: 'لقب نوح',
    },
    {
      source: 'noah',
      target: 'najaf',
      weight: 6,
      label: 'مدفن نوح بنابر روایات',
    },
    {
      source: 'noah',
      target: 'ham',
      weight: 5,
      label: 'پسر نوح',
    },
    {
      source: 'noah',
      target: 'yafeth',
      weight: 5,
      label: 'پسر نوح',
    },
    {
      source: 'noah',
      target: 'wife',
      weight: 5,
      label: 'مَثَل کفر در سوره‌ی تحریم',
    },
    {
      source: 'noah',
      target: 'kufa',
      weight: 5,
      label: 'محل ساخت کشتی بنابر روایات',
    },
    {
      source: 'noah',
      target: 'hud_p',
      weight: 5,
      label: 'پیامبری که پس از نوح مبعوث شد',
    },
    {
      source: 'ark',
      target: 'flood',
      weight: 8,
      label: 'نجات مؤمنان از طوفان',
    },
    {
      source: 'ark',
      target: 'judi',
      weight: 7,
      label: 'کشتی بر کوه جودی قرار گرفت (هود ۴۴)',
    },
    {
      source: 'ark',
      target: 'safina',
      weight: 7,
      label: 'اهل بیت به کشتی نوح تشبیه شده‌اند',
    },
    {
      source: 'ark',
      target: 'kufa',
      weight: 4,
      label: 'ساخت کشتی در مسجد کوفه (روایات)',
    },
    {
      source: 'flood',
      target: 'azab',
      weight: 6,
      label: 'نخستین عذاب فراگیر',
    },
    {
      source: 'flood',
      target: 'kanaan',
      weight: 6,
      label: 'غرق شدن در طوفان',
    },
    {
      source: 'safina',
      target: 'ahlulbayt',
      weight: 8,
      label: '«مثل اهل بیتی کمثل سفینة نوح»',
    },
    {
      source: 'safina',
      target: 'khatam',
      weight: 6,
      label: 'حدیثی از پیامبر خاتم (ص)',
    },
    {
      source: 'ahlulbayt',
      target: 'ali',
      weight: 7,
      label: 'نخستین امام از اهل بیت',
    },
    {
      source: 'ahlulbayt',
      target: 'mahdi',
      weight: 6,
      label: 'دوازدهمین امام از اهل بیت',
    },
    {
      source: 'ahlulbayt',
      target: 'khatam',
      weight: 7,
      label: 'خاندان پیامبر',
    },
    {
      source: 'ali',
      target: 'najaf',
      weight: 8,
      label: 'مدفن امیرالمؤمنین',
    },
    {
      source: 'ali',
      target: 'kufa',
      weight: 6,
      label: 'مرکز حکومت امیرالمؤمنین',
    },
    {
      source: 'ali',
      target: 'nahj',
      weight: 7,
      label: 'گزیده‌ی سخنان امیرالمؤمنین',
    },
    {
      source: 'ali',
      target: 'khatam',
      weight: 8,
      label: 'وصی و جانشین پیامبر',
    },
    {
      source: 'khatam',
      target: 'quran',
      weight: 10,
      label: 'کتاب آسمانی پیامبر خاتم',
    },
    {
      source: 'khatam',
      target: 'ulul',
      weight: 6,
      label: 'آخرین پیامبر اولوالعزم',
    },
    {
      source: 'khatam',
      target: 'mecca',
      weight: 6,
      label: 'زادگاه پیامبر',
    },
    {
      source: 'mecca',
      target: 'kaaba',
      weight: 7,
      label: 'کعبه در مکه است',
    },
    {
      source: 'ibrahim',
      target: 'kaaba',
      weight: 7,
      label: 'بنای کعبه به دست ابراهیم و اسماعیل',
    },
    {
      source: 'ibrahim',
      target: 'ismail',
      weight: 7,
      label: 'پدر و پسر',
    },
    {
      source: 'ismail',
      target: 'kaaba',
      weight: 5,
      label: 'همراه پدر در بنای کعبه',
    },
    {
      source: 'ibrahim',
      target: 'fire',
      weight: 6,
      label: 'نجات از آتش نمرود',
    },
    {
      source: 'ibrahim',
      target: 'ulul',
      weight: 6,
      label: 'پیامبر اولوالعزم',
    },
    {
      source: 'ibrahim',
      target: 'sam',
      weight: 5,
      label: 'ابراهیم از نسل سام',
    },
    {
      source: 'musa',
      target: 'ulul',
      weight: 5,
      label: 'پیامبر اولوالعزم',
    },
    {
      source: 'isa',
      target: 'ulul',
      weight: 5,
      label: 'پیامبر اولوالعزم',
    },
    {
      source: 'musa',
      target: 'torah',
      weight: 8,
      label: 'کتاب آسمانی موسی',
    },
    {
      source: 'isa',
      target: 'injil',
      weight: 8,
      label: 'کتاب آسمانی عیسی',
    },
    {
      source: 'torah',
      target: 'injil',
      weight: 4,
      label: 'کتب آسمانی اهل کتاب',
    },
    {
      source: 'quran',
      target: 'torah',
      weight: 5,
      label: 'قرآن تصدیق‌کننده‌ی تورات است',
    },
    {
      source: 'quran',
      target: 'injil',
      weight: 4,
      label: 'قرآن تصدیق‌کننده‌ی انجیل است',
    },
    {
      source: 'quran',
      target: 'surah_nuh',
      weight: 6,
      label: 'سوره‌ی ۷۱ قرآن',
    },
    {
      source: 'quran',
      target: 'hud_s',
      weight: 6,
      label: 'سوره‌ی ۱۱ قرآن',
    },
    {
      source: 'surah_nuh',
      target: 'idols',
      weight: 6,
      label: 'نام بت‌ها در آیه‌ی ۲۳',
    },
    {
      source: 'hud_s',
      target: 'hud_p',
      weight: 6,
      label: 'سوره به نام هود است',
    },
    {
      source: 'hud_s',
      target: 'judi',
      weight: 4,
      label: 'آیه‌ی ۴۴: قرار گرفتن کشتی بر جودی',
    },
    {
      source: 'adam',
      target: 'hawwa',
      weight: 8,
      label: 'همسر آدم',
    },
    {
      source: 'adam',
      target: 'habil',
      weight: 6,
      label: 'فرزند آدم',
    },
    {
      source: 'adam',
      target: 'idris',
      weight: 5,
      label: 'ادریس از نسل آدم',
    },
    {
      source: 'adam',
      target: 'najaf',
      weight: 4,
      label: 'مدفن آدم بنابر روایات',
    },
    {
      source: 'allah',
      target: 'tawhid',
      weight: 8,
      label: 'یگانگی خدا',
    },
    {
      source: 'longlife',
      target: 'mahdi',
      weight: 7,
      label: 'استناد به عمر نوح برای امکان عمر طولانی امام زمان',
    },
    {
      source: 'longlife',
      target: 'shaykh',
      weight: 5,
      label: 'وجه این لقب',
    },
    {
      source: 'sam',
      target: 'ham',
      weight: 3,
      label: 'برادر',
    },
    {
      source: 'sam',
      target: 'yafeth',
      weight: 3,
      label: 'برادر',
    },
    {
      source: 'azab',
      target: 'hud_p',
      weight: 4,
      label: 'عذاب قوم عاد پس از تکذیب هود',
    },
    {
      source: 'tawhid',
      target: 'ibrahim',
      weight: 4,
      label: 'منادی توحید در برابر بت‌پرستی',
    },
  ],
};
