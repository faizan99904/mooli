const URDU_NAME_MAP: Record<string, string> = {
  abdul: 'عبدال',
  abdullah: 'عبداللہ',
  adnan: 'عدنان',
  afzal: 'افضل',
  ahmad: 'احمد',
  ahmed: 'احمد',
  aisha: 'عائشہ',
  akbar: 'اکبر',
  ali: 'علی',
  amir: 'عامر',
  amna: 'آمنہ',
  aqsa: 'اقصیٰ',
  arham: 'ارحم',
  arsalan: 'ارسلان',
  asad: 'اسد',
  asif: 'آصف',
  aoun: 'اعون',
  ayesha: 'عائشہ',
  azhar: 'اظہر',
  bilal: 'بلال',
  bukhari: 'بخاری',
  danish: 'دانش',
  farhan: 'فرحان',
  farooq: 'فاروق',
  fatima: 'فاطمہ',
  faizan: 'فیضان',
  faisal: 'فیصل',
  hamza: 'حمزہ',
  haris: 'حارث',
  hassan: 'حسن',
  hina: 'حناء',
  hussain: 'حسین',
  ibrahim: 'ابراہیم',
  imran: 'عمران',
  iqra: 'اقراء',
  irfan: 'عرفان',
  javed: 'جاوید',
  javid: 'جاوید',
  kamran: 'کامران',
  khan: 'خان',
  maaz: 'معاذ',
  mahmood: 'محمود',
  maryam: 'مریم',
  mohsin: 'محسن',
  mohammad: 'محمد',
  muhammad: 'محمد',
  muneeb: 'منیب',
  mustafa: 'مصطفیٰ',
  nabeel: 'نبیل',
  nadeem: 'ندیم',
  nawaz: 'نواز',
  nida: 'ندا',
  noman: 'نعمان',
  omar: 'عمر',
  omer: 'عمر',
  osama: 'اسامہ',
  qasim: 'قاسم',
  rabia: 'رابعہ',
  rahman: 'رحمان',
  rashid: 'راشد',
  raza: 'رضا',
  rizwan: 'رضوان',
  saad: 'سعد',
  saba: 'صبا',
  sana: 'ثنا',
  sara: 'سارہ',
  shah: 'شاہ',
  shahid: 'شاہد',
  shoaib: 'شعیب',
  sidra: 'سدرہ',
  tahir: 'طاہر',
  tariq: 'طارق',
  ubaid: 'عبید',
  umair: 'عمیر',
  umar: 'عمر',
  usman: 'عثمان',
  waqas: 'وقاص',
  yasir: 'یاسر',
  yousaf: 'یوسف',
  yusuf: 'یوسف',
  zain: 'زین',
  zainab: 'زینب',
  zeeshan: 'ذیشان',
  zubair: 'زبیر',
};

const INITIAL_VOWELS: Record<string, string> = {
  a: 'ا',
  e: 'ای',
  i: 'ا',
  o: 'او',
  u: 'ا',
};

const PHONETIC_GROUPS: Array<[string, string]> = [
  ['allah', 'اللہ'],
  ['kh', 'خ'],
  ['gh', 'غ'],
  ['sh', 'ش'],
  ['ch', 'چ'],
  ['ph', 'ف'],
  ['zh', 'ژ'],
  ['th', 'تھ'],
  ['dh', 'دھ'],
  ['bh', 'بھ'],
  ['aa', 'ا'],
  ['ee', 'ی'],
  ['ea', 'ی'],
  ['oo', 'و'],
  ['ou', 'و'],
  ['au', 'اؤ'],
  ['ai', 'ی'],
  ['ay', 'ے'],
];

const LETTER_MAP: Record<string, string> = {
  a: 'ا',
  b: 'ب',
  c: 'ک',
  d: 'د',
  e: 'ی',
  f: 'ف',
  g: 'گ',
  h: 'ہ',
  i: 'ی',
  j: 'ج',
  k: 'ک',
  l: 'ل',
  m: 'م',
  n: 'ن',
  o: 'و',
  p: 'پ',
  q: 'ق',
  r: 'ر',
  s: 'س',
  t: 'ت',
  u: 'و',
  v: 'و',
  w: 'و',
  x: 'کس',
  y: 'ی',
  z: 'ز',
};

const transliterateToken = (token: string): string => {
  const normalized = token.toLowerCase().replace(/[^a-z]/g, '');

  if (!normalized) {
    return token;
  }

  if (URDU_NAME_MAP[normalized]) {
    return URDU_NAME_MAP[normalized];
  }

  let index = 0;
  let result = '';

  while (index < normalized.length) {
    const group = PHONETIC_GROUPS.find(([source]) =>
      normalized.startsWith(source, index)
    );

    if (group) {
      result += group[1];
      index += group[0].length;
      continue;
    }

    const letter = normalized[index];
    result +=
      index === 0 && INITIAL_VOWELS[letter]
        ? INITIAL_VOWELS[letter]
        : LETTER_MAP[letter] || letter;
    index += 1;
  }

  return result;
};

export const transliterateDoctorNameToUrdu = (
  value?: string | null
): string => {
  const plainName = String(value || '')
    .trim()
    .replace(/^(dr|doctor)\.?\s*/i, '')
    .trim();

  if (!plainName) {
    return '';
  }

  const urduName = plainName
    .split(/\s+/)
    .filter(Boolean)
    .map(transliterateToken)
    .join(' ');

  return urduName ? `ڈاکٹر ${urduName}` : '';
};
