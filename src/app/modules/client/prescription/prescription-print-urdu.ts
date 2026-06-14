import { transliterateDoctorNameToUrdu } from '../../../shared/utils/urdu-transliteration';

const URDU_WORD_MAP: Record<string, string> = {
  dr: 'ڈاکٹر',
  doctor: 'ڈاکٹر',
  consultant: 'کنسلٹنٹ',
  physician: 'فزیشن',
  general: 'جنرل',
  hospital: 'ہسپتال',
  medical: 'میڈیکل',
  city: 'سٹی',
  care: 'کیئر',
  demo: 'ڈیمو',
  medilink: 'میڈی لنک',
  main: 'مین',
  boulevard: 'بلیوارڈ',
  road: 'روڈ',
  street: 'سٹریٹ',
  chowk: 'چوک',
  lahore: 'لاہور',
  karachi: 'کراچی',
  islamabad: 'اسلام آباد',
  pakistan: 'پاکستان',
  cardiology: 'کارڈیالوجی',
  medicine: 'میڈیسن',
  surgery: 'سرجری',
  pediatrics: 'اطفال',
  gynecology: 'امراض نسواں',
  mbbs: 'ایم بی بی ایس',
  fcps: 'ایف سی پی ایس',
  md: 'ایم ڈی',
  ms: 'ایم ایس',
  bds: 'بی ڈی ایس',
  bahawalpur: 'بہاولپور',
  bahawal: 'بہاول',
  university: 'یونیورسٹی',
  liaquat: 'لیاقت',
  pur: 'پور',
  testing: 'ٹیسٹنگ',
  health: 'ہیلتھ',
  healthcare: 'ہیلتھ کیئر',
  clinic: 'کلینک',
  colony: 'کالونی',
  market: 'مارکیٹ',
  town: 'ٹاؤن',
  block: 'بلاک',
  sector: 'سیکٹر',
  phase: 'فیز',
  nagar: 'نگر',
  multan: 'ملتان',
  faisalabad: 'فیصل آباد',
  rawalpindi: 'راولپنڈی',
  peshawar: 'پشاور',
  quetta: 'کوئٹہ',
  sialkot: 'سیالکوٹ',
  gujranwala: 'گوجرانوالہ',
  hyderabad: 'حیدرآباد',
  sargodha: 'سرگودھا',
  rahim: 'رحیم',
  yar: 'یار',
  khan: 'خان',
  aoun: 'اعون',
  javaid: 'جاوید',
  javid: 'جاوید',
};

const ENGLISH_WORD_MAP: Record<string, string> = {
  pakistan: 'Pakistan',
  lahore: 'Lahore',
  karachi: 'Karachi',
  islamabad: 'Islamabad',
  bahawalpur: 'Bahawalpur',
  mbbs: 'MBBS',
  fcps: 'FCPS',
  md: 'MD',
  ms: 'MS',
  bds: 'BDS',
  dr: 'Dr.',
  uk: 'UK',
  usa: 'USA',
  uae: 'UAE',
};

const URDU_NAME_MAP: Record<string, string> = {
  ayesha: 'عائشہ',
  aisha: 'عائشہ',
  aoun: 'اعون',
  javaid: 'جاوید',
  javed: 'جاوید',
  khan: 'خان',
  ali: 'علی',
  ahmed: 'احمد',
  ahmad: 'احمد',
  hassan: 'حسن',
  hasan: 'حسن',
  fatima: 'فاطمہ',
  muhammad: 'محمد',
  mohammad: 'محمد',
  maaz: 'معاذ',
  bukhari: 'بخاری',
  sara: 'سارہ',
  usman: 'عثمان',
  bilal: 'بلال',
  zain: 'زین',
  hina: 'حناء',
};

const translateWordToUrdu = (word: string): string => {
  const cleaned = word.replace(/[.,]/g, '');
  const lower = cleaned.toLowerCase();
  if (!lower) {
    return word;
  }

  if (URDU_WORD_MAP[lower]) {
    return URDU_WORD_MAP[lower];
  }

  if (URDU_NAME_MAP[lower]) {
    return URDU_NAME_MAP[lower];
  }

  return cleaned;
};

const formatEnglishToken = (token: string): string => {
  const cleaned = token.replace(/[.,]/g, '');
  const lower = cleaned.toLowerCase();
  if (!lower) {
    return token;
  }

  if (ENGLISH_WORD_MAP[lower]) {
    return ENGLISH_WORD_MAP[lower];
  }

  if (/^[A-Z]{2,}$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

const splitAddressSegments = (value: string): string[] =>
  value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

const splitAddressWords = (segment: string): string[] =>
  segment
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

export const formatEnglishOrganizationName = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressWords(raw).map(formatEnglishToken).join(' ');
};

export const formatEnglishAddress = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressSegments(raw)
    .map((segment) => splitAddressWords(segment).map(formatEnglishToken).join(' '))
    .join(', ');
};

export const formatUrduAddress = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressSegments(raw)
    .map((segment) => splitAddressWords(segment).map(translateWordToUrdu).join(' '))
    .join('، ');
};

export const formatUrduOrganizationName = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressWords(raw).map(translateWordToUrdu).join(' ');
};

const transliterateToken = (token: string): string => translateWordToUrdu(token);

export const toPrescriptionUrduText = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressWords(raw.replace(/,/g, ' ')).map(translateWordToUrdu).join(' ');
};

export const stripDoctorPrefix = (name?: string | null): string =>
  String(name || '')
    .trim()
    .replace(/^dr\.?\s*/i, '')
    .trim();

export const formatEnglishDoctorName = (name?: string | null): string => {
  const plain = stripDoctorPrefix(name);
  return plain ? `Dr. ${plain}` : 'Dr.';
};

export const formatUrduDoctorName = (
  name?: string | null,
  urduName?: string | null
): string => {
  const manualUrdu = String(urduName || '').trim();
  if (manualUrdu) {
    return manualUrdu.startsWith('ڈاکٹر') ? manualUrdu : `ڈاکٹر ${manualUrdu}`;
  }

  const plain = stripDoctorPrefix(name);
  if (!plain) {
    return 'ڈاکٹر';
  }

  return transliterateDoctorNameToUrdu(plain) || 'ڈاکٹر';
};

export const formatEnglishDoctorTitle = (_specialization?: string | null): string => 'Consultant Physician';

export const formatUrduDoctorTitle = (_specialization?: string | null): string => 'کنسلٹنٹ فزیشن';

export const formatUrduQualification = (qualification?: string | null): string => {
  const value = String(qualification || '').trim();
  if (!value) {
    return 'ایم بی بی ایس، ایف سی پی ایس';
  }

  return value
    .split(',')
    .map((segment) => splitAddressWords(segment.trim()).map(translateWordToUrdu).join(' '))
    .filter(Boolean)
    .join('، ');
};
