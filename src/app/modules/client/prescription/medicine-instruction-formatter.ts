export type DoseSlot = 'morning' | 'noon' | 'evening' | 'night';

export interface SlotSchedule {
  morning: boolean;
  noon: boolean;
  evening: boolean;
  night: boolean;
}

export interface MedicineInstructionInput {
  dosage?: string;
  frequency?: string;
  morning?: boolean;
  noon?: boolean;
  evening?: boolean;
  night?: boolean;
  morningDose?: string;
  noonDose?: string;
  eveningDose?: string;
  nightDose?: string;
  beforeMeal?: boolean;
  afterMeal?: boolean;
}

export interface FrequencySchedule {
  key: string;
  label: string;
  shorthandCode: string;
  humanPhrase: string;
  instructionNote: string;
  slots: SlotSchedule;
}

export interface FormattedMedicineInstruction {
  frequencyLabel: string;
  shorthandCode: string;
  human: string;
  shorthand: string;
  combined: string;
  schedule: SlotSchedule;
}

const EMPTY_SLOTS: SlotSchedule = {
  morning: false,
  noon: false,
  evening: false,
  night: false,
};

const FREQUENCY_DEFINITIONS: Record<string, FrequencySchedule> = {
  od: {
    key: 'od',
    label: 'Once daily (OD)',
    shorthandCode: 'OD',
    humanPhrase: 'once daily',
    instructionNote: '',
    slots: { morning: true, noon: false, evening: false, night: false },
  },
  qd: {
    key: 'qd',
    label: 'Once daily (QD)',
    shorthandCode: 'QD',
    humanPhrase: 'once daily',
    instructionNote: '',
    slots: { morning: true, noon: false, evening: false, night: false },
  },
  bd: {
    key: 'bd',
    label: 'Twice daily (BD)',
    shorthandCode: 'BD',
    humanPhrase: 'twice daily',
    instructionNote: '',
    slots: { morning: true, noon: false, evening: true, night: false },
  },
  bid: {
    key: 'bid',
    label: 'Twice daily (BID)',
    shorthandCode: 'BID',
    humanPhrase: 'twice daily',
    instructionNote: '',
    slots: { morning: true, noon: false, evening: true, night: false },
  },
  tds: {
    key: 'tds',
    label: 'Three times daily (TDS)',
    shorthandCode: 'TDS',
    humanPhrase: 'three times daily',
    instructionNote: '',
    slots: { morning: true, noon: true, evening: true, night: false },
  },
  tid: {
    key: 'tid',
    label: 'Three times daily (TID)',
    shorthandCode: 'TID',
    humanPhrase: 'three times daily',
    instructionNote: '',
    slots: { morning: true, noon: true, evening: true, night: false },
  },
  qid: {
    key: 'qid',
    label: 'Four times daily (QID)',
    shorthandCode: 'QID',
    humanPhrase: 'four times daily',
    instructionNote: '',
    slots: { morning: true, noon: true, evening: true, night: true },
  },
  hs: {
    key: 'hs',
    label: 'At night (HS)',
    shorthandCode: 'HS',
    humanPhrase: 'at night',
    instructionNote: 'Take at night',
    slots: { morning: false, noon: false, evening: false, night: true },
  },
  am: {
    key: 'am',
    label: 'Morning (AM)',
    shorthandCode: 'AM',
    humanPhrase: 'in the morning',
    instructionNote: '',
    slots: { morning: true, noon: false, evening: false, night: false },
  },
  noon: {
    key: 'noon',
    label: 'At noon',
    shorthandCode: 'Noon',
    humanPhrase: 'at noon',
    instructionNote: '',
    slots: { morning: false, noon: true, evening: false, night: false },
  },
  pm: {
    key: 'pm',
    label: 'Evening (PM)',
    shorthandCode: 'PM',
    humanPhrase: 'in the evening',
    instructionNote: '',
    slots: { morning: false, noon: false, evening: true, night: false },
  },
  sos: {
    key: 'sos',
    label: 'As needed (SOS)',
    shorthandCode: 'SOS',
    humanPhrase: 'as needed',
    instructionNote: 'Use when needed',
    slots: EMPTY_SLOTS,
  },
};

const FREQUENCY_ALIASES: Record<string, string> = {
  od: 'od',
  qd: 'qd',
  'once-daily': 'od',
  'once-daily-od': 'od',
  bd: 'bd',
  bid: 'bid',
  'twice-daily': 'bd',
  tds: 'tds',
  tid: 'tid',
  'three-times-daily': 'tds',
  qid: 'qid',
  'four-times-daily': 'qid',
  hs: 'hs',
  bedtime: 'hs',
  am: 'am',
  noon: 'noon',
  pm: 'pm',
  sos: 'sos',
  prn: 'sos',
};

const FREQUENCY_PHRASES: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /\b(?:as|when|if)\s+needed\b/i, key: 'sos' },
  { pattern: /\b(?:at|before)\s+(?:night|bed(?:time)?|sleep)\b/i, key: 'hs' },
  {
    pattern: /\b(?:three|3)\s*(?:times?|x)\s*(?:a\s*day|daily|per\s*day)\b/i,
    key: 'tds',
  },
  {
    pattern: /\b(?:four|4)\s*(?:times?|x)\s*(?:a\s*day|daily|per\s*day)\b/i,
    key: 'qid',
  },
  {
    pattern: /\b(?:twice|two|2)\s*(?:times?|x)\s*(?:a\s*day|daily|per\s*day)\b/i,
    key: 'bd',
  },
  {
    pattern: /\b(?:once|one|1)\s*(?:times?|x)\s*(?:a\s*day|daily|per\s*day)\b/i,
    key: 'od',
  },
  { pattern: /\bthree\s+times\s+daily\b/i, key: 'tds' },
  { pattern: /\btwice\s+daily\b/i, key: 'bd' },
  { pattern: /\bonce\s+daily\b/i, key: 'od' },
  { pattern: /\bfour\s+times\s+daily\b/i, key: 'qid' },
];

const TOKEN_PATTERN = /\b(od|qd|bd|bid|tds|tid|qid|hs|am|noon|pm|sos|prn|bedtime)\b/i;

export const normalizeFrequencyToken = (value = ''): string => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  return FREQUENCY_ALIASES[normalized] || normalized;
};

export const detectFrequencyKey = (input = ''): string | null => {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  for (const phrase of FREQUENCY_PHRASES) {
    if (phrase.pattern.test(trimmed)) {
      return phrase.key;
    }
  }

  const tokenMatch = trimmed.match(TOKEN_PATTERN);
  if (tokenMatch) {
    return normalizeFrequencyToken(tokenMatch[1]);
  }

  const normalized = normalizeFrequencyToken(trimmed);
  if (FREQUENCY_DEFINITIONS[normalized]) {
    return normalized;
  }

  return null;
};

export const getFrequencySchedule = (key = ''): FrequencySchedule | null => {
  const normalized = normalizeFrequencyToken(key);
  return FREQUENCY_DEFINITIONS[normalized] || null;
};

export const inferFrequencyFromSlots = (slots: SlotSchedule): string | null => {
  const activeSlots = (Object.entries(slots) as Array<[DoseSlot, boolean]>).filter(([, active]) => active);
  if (!activeSlots.length) {
    return null;
  }

  if (slots.night && activeSlots.length === 1) {
    return 'hs';
  }

  if (slots.morning && slots.evening && !slots.noon && !slots.night) {
    return 'bd';
  }

  if (slots.morning && slots.noon && slots.evening && !slots.night) {
    return 'tds';
  }

  if (slots.morning && slots.noon && slots.evening && slots.night) {
    return 'qid';
  }

  if (slots.morning && activeSlots.length === 1) {
    return 'od';
  }

  if (slots.evening && activeSlots.length === 1) {
    return 'pm';
  }

  if (slots.noon && activeSlots.length === 1) {
    return 'noon';
  }

  return 'od';
};

export const containsFrequencyPattern = (input = ''): boolean => Boolean(detectFrequencyKey(input));

export const stripFrequencyPatterns = (input = ''): string => {
  let remainder = input.trim();

  FREQUENCY_PHRASES.forEach(({ pattern }) => {
    remainder = remainder.replace(pattern, ' ');
  });

  remainder = remainder.replace(TOKEN_PATTERN, ' ');

  return remainder.replace(/\s+/g, ' ').trim();
};

const slotScheduleFromInput = (input: MedicineInstructionInput): SlotSchedule => ({
  morning: Boolean(input.morning),
  noon: Boolean(input.noon),
  evening: Boolean(input.evening),
  night: Boolean(input.night),
});

const hasActiveSlots = (slots: SlotSchedule): boolean =>
  slots.morning || slots.noon || slots.evening || slots.night;

const resolveSchedule = (input: MedicineInstructionInput): FrequencySchedule | null => {
  const frequencyKey =
    detectFrequencyKey(input.frequency || '') || inferFrequencyFromSlots(slotScheduleFromInput(input));

  if (!frequencyKey) {
    return null;
  }

  return getFrequencySchedule(frequencyKey);
};

const slotDoseValue = (input: MedicineInstructionInput, slot: DoseSlot): string => {
  const explicit = String(input[`${slot}Dose`] || '').trim();
  if (explicit) {
    return explicit;
  }

  return input[slot] ? '1' : '';
};

const resolveDoseAmount = (input: MedicineInstructionInput, schedule: FrequencySchedule | null): string => {
  const dosage = String(input.dosage || '').trim();
  if (dosage) {
    return dosage;
  }

  if (!schedule) {
    return '1 tablet';
  }

  const activeSlots = (['morning', 'noon', 'evening', 'night'] as DoseSlot[]).filter((slot) => schedule.slots[slot]);
  const slotDose = activeSlots.map((slot) => slotDoseValue(input, slot)).find(Boolean);
  if (slotDose) {
    return slotDose.includes('tab') || slotDose.includes('cap') || slotDose.includes('ml') ? slotDose : `${slotDose} tablet`;
  }

  return '1 tablet';
};

const abbreviateDose = (dose: string): string =>
  dose
    .replace(/\btablets?\b/gi, (match) => (match.toLowerCase().startsWith('tablet') && match.toLowerCase().endsWith('s') ? 'tabs' : 'tab'))
    .replace(/\bcapsules?\b/gi, (match) => (match.toLowerCase().startsWith('capsule') && match.toLowerCase().endsWith('s') ? 'caps' : 'cap'))
    .replace(/\s+/g, ' ')
    .trim();

const formatHumanTimeBreakdown = (slots: SlotSchedule): string => {
  const labels: string[] = [];
  if (slots.morning) labels.push('morning');
  if (slots.noon) labels.push('afternoon');
  if (slots.evening) labels.push('evening');
  if (slots.night) labels.push('night');

  if (!labels.length) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} + ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(' + ')} + ${labels[labels.length - 1]}`;
};

const formatShorthandTimeBreakdown = (slots: SlotSchedule): string => {
  const labels: string[] = [];
  if (slots.morning) labels.push('AM');
  if (slots.noon) labels.push('Noon');
  if (slots.evening) labels.push('PM');
  if (slots.night) labels.push('HS');

  if (!labels.length) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return labels.join(' + ');
};

const appendMealTiming = (text: string, shorthand: boolean, beforeMeal?: boolean, afterMeal?: boolean): string => {
  if (beforeMeal) {
    return `${text}${shorthand ? ' AC' : ' before meals'}`;
  }

  if (afterMeal) {
    return `${text}${shorthand ? ' PC' : ' after meals'}`;
  }

  return text;
};

export const buildMedicineInstructions = (input: MedicineInstructionInput): FormattedMedicineInstruction | null => {
  const schedule = resolveSchedule(input);
  if (!schedule) {
    return null;
  }

  const dose = resolveDoseAmount(input, schedule);
  const shorthandDose = abbreviateDose(dose);
  const slots = hasActiveSlots(slotScheduleFromInput(input)) ? slotScheduleFromInput(input) : schedule.slots;
  const humanTime = formatHumanTimeBreakdown(slots);
  const shorthandTime = formatShorthandTimeBreakdown(slots);

  let human = `Take ${dose} ${schedule.humanPhrase}`;
  if (humanTime && schedule.key !== 'sos') {
    human += ` (${humanTime})`;
  }
  human = appendMealTiming(human, false, input.beforeMeal, input.afterMeal);

  let shorthand = `${shorthandDose} ${schedule.shorthandCode}`;
  if (shorthandTime && schedule.key !== 'sos') {
    shorthand += ` (${shorthandTime})`;
  }
  shorthand = appendMealTiming(shorthand, true, input.beforeMeal, input.afterMeal);

  if (schedule.instructionNote) {
    human = `${schedule.instructionNote}. ${human}`;
  }

  return {
    frequencyLabel: schedule.label,
    shorthandCode: schedule.shorthandCode,
    human,
    shorthand,
    combined: `${human}\n→ ${shorthand}`,
    schedule: slots,
  };
};

export const mapFrequencyToTimings = (shortcut = ''): {
  label: string;
  instruction: string;
  morning: boolean;
  noon: boolean;
  evening: boolean;
  night: boolean;
} => {
  const schedule = getFrequencySchedule(detectFrequencyKey(shortcut) || shortcut);
  const empty = { label: '', instruction: '', ...EMPTY_SLOTS };

  if (!schedule) {
    return empty;
  }

  return {
    label: schedule.label,
    instruction: schedule.instructionNote,
    ...schedule.slots,
  };
};
