import {
  buildMedicineInstructions,
  detectFrequencyKey,
  mapFrequencyToTimings,
  stripFrequencyPatterns,
} from './medicine-instruction-formatter';

describe('medicine-instruction-formatter', () => {
  it('detects natural language frequency phrases', () => {
    expect(detectFrequencyKey('Paracetamol twice daily')).toBe('bd');
    expect(detectFrequencyKey('once daily')).toBe('od');
    expect(detectFrequencyKey('three times daily')).toBe('tds');
    expect(detectFrequencyKey('at night')).toBe('hs');
    expect(detectFrequencyKey('as needed')).toBe('sos');
    expect(detectFrequencyKey('BID')).toBe('bid');
    expect(detectFrequencyKey('TID')).toBe('tid');
  });

  it('strips frequency tokens from medicine search text', () => {
    expect(stripFrequencyPatterns('Paracetamol 500mg twice daily 7d')).toBe('Paracetamol 500mg 7d');
  });

  it('formats dual human and shorthand instructions', () => {
    const formatted = buildMedicineInstructions({
      dosage: '1 tablet',
      frequency: 'twice daily',
    });

    expect(formatted?.human).toBe('Take 1 tablet twice daily (morning + evening)');
    expect(formatted?.shorthand).toBe('1 tab BD (AM + PM)');
    expect(formatted?.combined).toContain('→ 1 tab BD (AM + PM)');
    expect(formatted?.frequencyLabel).toBe('Twice daily (BD)');
  });

  it('maps shortcut tokens to slot timings', () => {
    expect(mapFrequencyToTimings('hs')).toEqual({
      label: 'At night (HS)',
      instruction: 'Take at night',
      morning: false,
      noon: false,
      evening: false,
      night: true,
    });
  });

  it('keeps dosage unchanged in human instruction', () => {
    const formatted = buildMedicineInstructions({
      dosage: '500mg',
      frequency: 'OD',
    });

    expect(formatted?.human).toContain('500mg');
    expect(formatted?.shorthand).toContain('500mg');
  });
});
