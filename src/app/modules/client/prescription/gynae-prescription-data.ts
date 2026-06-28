export type GynaeFieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date';
  placeholder?: string;
  options?: string[];
  wide?: boolean;
};

export type GynaeConsultMode = 'antenatal' | 'gynae_problem' | 'postnatal';

export type GynaeLabCategory = 'common' | 'pregnancy' | 'infertility' | 'infection' | 'ultrasound';

export const GYNAE_CONSULT_MODE_TABS: Array<{
  key: GynaeConsultMode;
  labelEn: string;
  labelUr: string;
}> = [
  { key: 'antenatal', labelEn: 'Antenatal', labelUr: 'حمل کے دوران دیکھ بھال' },
  { key: 'gynae_problem', labelEn: 'Gynae Problem', labelUr: 'نسوانی مسائل' },
  { key: 'postnatal', labelEn: 'Postnatal', labelUr: 'زچگی کے بعد دیکھ بھال' },
];

export const GYNAE_CONSULT_MODES: Array<{ key: GynaeConsultMode; label: string }> = [
  { key: 'antenatal', label: 'Antenatal / Pregnancy' },
  { key: 'gynae_problem', label: 'Gynae Problem' },
  { key: 'postnatal', label: 'Postnatal' },
];

export const GYNAE_LAB_CATEGORIES: Array<{ key: GynaeLabCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'common', label: 'Common' },
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'infertility', label: 'Infertility' },
  { key: 'infection', label: 'Infection' },
  { key: 'ultrasound', label: 'Ultrasound' },
];

export const GYNAE_LAB_CATALOG: Array<{ name: string; category: string; gynaeGroup: GynaeLabCategory }> = [
  { name: 'CBC', category: 'Hematology', gynaeGroup: 'common' },
  { name: 'Blood Group + Rh', category: 'Hematology', gynaeGroup: 'pregnancy' },
  { name: 'Urine R/E', category: 'Urine', gynaeGroup: 'common' },
  { name: 'RBS', category: 'Biochemistry', gynaeGroup: 'common' },
  { name: 'TSH', category: 'Biochemistry', gynaeGroup: 'pregnancy' },
  { name: 'HbA1c', category: 'Biochemistry', gynaeGroup: 'pregnancy' },
  { name: 'HBsAg', category: 'Serology', gynaeGroup: 'pregnancy' },
  { name: 'Anti-HCV', category: 'Serology', gynaeGroup: 'pregnancy' },
  { name: 'HIV', category: 'Serology', gynaeGroup: 'pregnancy' },
  { name: 'VDRL', category: 'Serology', gynaeGroup: 'pregnancy' },
  { name: 'Beta hCG', category: 'Biochemistry', gynaeGroup: 'pregnancy' },
  { name: 'Ultrasound Obstetric', category: 'Ultrasound', gynaeGroup: 'ultrasound' },
  { name: 'Pap Smear', category: 'Gynae', gynaeGroup: 'infection' },
  { name: 'HVS / Culture', category: 'Microbiology', gynaeGroup: 'infection' },
  { name: 'Urine Culture', category: 'Microbiology', gynaeGroup: 'infection' },
  { name: 'AMH', category: 'Hormones', gynaeGroup: 'infertility' },
  { name: 'FSH', category: 'Hormones', gynaeGroup: 'infertility' },
  { name: 'LH', category: 'Hormones', gynaeGroup: 'infertility' },
  { name: 'Prolactin', category: 'Hormones', gynaeGroup: 'infertility' },
  { name: 'Progesterone', category: 'Hormones', gynaeGroup: 'infertility' },
  { name: 'Pelvic Ultrasound', category: 'Ultrasound', gynaeGroup: 'ultrasound' },
];

export const GYNAE_ULTRASOUND_STUDIES: Array<{ key: string; label: string }> = [
  { key: 'usgObstetric', label: 'USG Obstetric' },
  { key: 'usgPelvis', label: 'USG Pelvis' },
  { key: 'tvs', label: 'TVS' },
  { key: 'follicularTracking', label: 'Follicular Tracking' },
  { key: 'anomalyScan', label: 'Anomaly Scan' },
  { key: 'growthScan', label: 'Growth Scan' },
  { key: 'doppler', label: 'Doppler' },
  { key: 'bpp', label: 'BPP' },
];

export const GYNAE_VITAL_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'urineSugar', label: 'Urine Sugar', placeholder: 'Nil / Trace / +' },
  { key: 'urineAlbumin', label: 'Urine Albumin', placeholder: 'Nil / Trace / +' },
  { key: 'hemoglobin', label: 'Hemoglobin', placeholder: '11.5 g/dL' },
  { key: 'fundalHeight', label: 'Fundal Height', placeholder: '21 cm' },
  { key: 'fetalHeartRate', label: 'Fetal Heart Rate', placeholder: '152 /min' },
];

export const GYNAE_ADVICE_TEMPLATES: Array<{ label: string; text: string }> = [
  {
    label: 'Pregnancy diet',
    text: 'Take balanced diet with fruits, vegetables, protein and adequate fluids. Avoid raw/undercooked food.',
  },
  {
    label: 'Folic acid',
    text: 'Continue folic acid as advised throughout pregnancy unless instructed otherwise.',
  },
  {
    label: 'Rest advice',
    text: 'Take adequate rest. Avoid heavy lifting and strenuous activity.',
  },
  {
    label: 'Danger signs',
    text: 'Visit emergency immediately in case of bleeding, severe abdominal pain, fever, headache, blurred vision or reduced fetal movements.',
  },
  {
    label: 'Follow-up 2 weeks',
    text: 'Follow up after 2 weeks or earlier if symptoms worsen.',
  },
  {
    label: 'Antenatal care',
    text: 'Continue regular antenatal visits, medicines and investigations as advised.',
  },
  {
    label: 'Post C-section care',
    text: 'Keep wound clean and dry. Avoid heavy work for 6 weeks. Report fever, wound discharge or severe pain immediately.',
  },
  {
    label: 'Infertility workup',
    text: 'Investigations and follow-up as per infertility workup plan. Partner evaluation advised if indicated.',
  },
];

export const GYNAE_EXTRA_FIELDS: GynaeFieldDef[] = [
  { key: 'gynaeMode', label: 'Consult Mode', type: 'select', options: ['antenatal', 'gynae_problem', 'postnatal'] },
  { key: 'cycleRegularity', label: 'Cycle Regularity', type: 'select', options: ['Regular', 'Irregular'] },
  {
    key: 'cycleLength',
    label: 'Cycle Length',
    type: 'select',
    options: ['21-28 days', '28-35 days', '35-45 days', '> 45 days', 'Variable'],
  },
  {
    key: 'durationOfFlow',
    label: 'Duration of Flow',
    type: 'select',
    options: ['2-3 days', '4-5 days', '5 days', '6-7 days', '> 7 days'],
  },
  {
    key: 'amountOfBleeding',
    label: 'Amount of Bleeding',
    type: 'select',
    options: ['Scanty', 'Light', 'Moderate', 'Heavy', 'Very Heavy'],
  },
  { key: 'married', label: 'Marital Status', type: 'select', options: ['Married', 'Unmarried', 'Widowed', 'Divorced'] },
  { key: 'pregnancyStatus', label: 'Pregnancy Status', type: 'select', options: ['Pregnant', 'Not Pregnant', 'Suspected'] },
  { key: 'living', label: 'Living Children' },
  { key: 'previousCSection', label: 'Previous C-Section', type: 'select', options: ['Yes', 'No'] },
  { key: 'fetalMovement', label: 'Fetal Movement', type: 'select', options: ['Present', 'Reduced', 'Absent'] },
  { key: 'pvBleeding', label: 'PV Bleeding', type: 'select', options: ['Yes', 'No'] },
  { key: 'painAbdomen', label: 'Pain Abdomen', type: 'select', options: ['Yes', 'No'] },
  { key: 'bpIssue', label: 'BP Issue', type: 'select', options: ['Yes', 'No'] },
  { key: 'diabetesInPregnancy', label: 'Diabetes in Pregnancy', type: 'select', options: ['Yes', 'No'] },
  { key: 'presentation', label: 'Presentation', type: 'select', options: ['Cephalic', 'Breech', 'Transverse'] },
  {
    key: 'edema',
    label: 'Edema',
    type: 'select',
    options: ['None', 'Mild', 'Moderate', 'Severe'],
  },
  {
    key: 'urineSugar',
    label: 'Urine Sugar',
    type: 'select',
    options: ['Negative', 'Trace', '+', '++', '+++'],
  },
  {
    key: 'urineAlbumin',
    label: 'Urine Albumin',
    type: 'select',
    options: ['Negative', 'Trace', '+', '++', '+++'],
  },
  { key: 'hemoglobin', label: 'Hemoglobin', placeholder: '11.5 g/dL' },
  { key: 'menstrualHistory', label: 'Menstrual History', type: 'textarea', wide: true },
  { key: 'irregularPeriods', label: 'Irregular Periods', type: 'select', options: ['Yes', 'No'] },
  { key: 'heavyBleeding', label: 'Heavy Bleeding', type: 'select', options: ['Yes', 'No'] },
  { key: 'whiteDischarge', label: 'White Discharge', type: 'select', options: ['Yes', 'No'] },
  { key: 'lowerAbdominalPain', label: 'Lower Abdominal Pain', type: 'select', options: ['Yes', 'No'] },
  { key: 'dysmenorrhea', label: 'Dysmenorrhea', type: 'select', options: ['Yes', 'No'] },
  { key: 'postcoitalBleeding', label: 'Postcoital Bleeding', type: 'select', options: ['Yes', 'No'] },
  { key: 'urinarySymptoms', label: 'Urinary Symptoms', type: 'select', options: ['Yes', 'No'] },
  { key: 'dyspareunia', label: 'Dyspareunia', type: 'select', options: ['Yes', 'No'] },
  {
    key: 'menopauseStatus',
    label: 'Menopause Status',
    type: 'select',
    options: ['Pre-menopausal', 'Peri-menopausal', 'Post-menopausal'],
  },
  {
    key: 'infertilityDuration',
    label: 'Infertility Duration',
    type: 'select',
    options: ['--', '< 6 months', '6-12 months', '1-2 years', '> 2 years'],
  },
  { key: 'gynaeItching', label: 'Itching', type: 'select', options: ['Yes', 'No'] },
  { key: 'gynaeBloating', label: 'Bloating', type: 'select', options: ['Yes', 'No'] },
  { key: 'pcosHistory', label: 'PCOS History', type: 'select', options: ['Yes', 'No'] },
  { key: 'contraceptionHistory', label: 'Contraception History', type: 'select', options: ['None', 'Condom (Occasional)', 'OCP', 'IUCD', 'Injectable', 'Implant', 'Other'] },
  { key: 'infertilityHistory', label: 'Infertility History', type: 'textarea', wide: true },
  { key: 'previousSurgery', label: 'Previous Surgery', type: 'textarea', wide: true },
  { key: 'papSmearRecord', label: 'Pap Smear Record', type: 'textarea', wide: true },
  { key: 'breastExaminationNote', label: 'Breast Examination Note', type: 'textarea', wide: true },
  { key: 'antenatalOtherNotes', label: 'Other Notes', type: 'textarea', wide: true },
  { key: 'pelvicFindings', label: 'Examination / Pelvic Findings', type: 'textarea', wide: true },
  { key: 'provisionalDiagnosis', label: 'Provisional Diagnosis', type: 'textarea', wide: true },
  { key: 'treatmentPlan', label: 'Treatment Plan', type: 'textarea', wide: true },
  { key: 'gynecologyNotes', label: 'Gynecology Notes', type: 'textarea', wide: true },
  { key: 'antenatalDangerHeavyBleedingCounselled', label: 'Heavy Bleeding Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'antenatalDangerFeverCounselled', label: 'Fever Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'antenatalDangerSevereAbdominalPainCounselled', label: 'Severe Abdominal Pain Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'antenatalDangerSevereVomitingCounselled', label: 'Severe Vomiting Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'antenatalDangerSevereHeadacheCounselled', label: 'Severe Headache Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'antenatalDangerDecreasedFetalMovementCounselled', label: 'Decreased Fetal Movement Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'antenatalDangerSwellingHypertensionCounselled', label: 'Swelling / Hypertension Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'antenatalDangerConvulsionsCounselled', label: 'Convulsions Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'redFlagHeavyBleeding', label: 'Heavy Bleeding Red Flag', type: 'select', options: ['Yes', 'No'] },
  { key: 'redFlagPostmenopausalBleeding', label: 'Postmenopausal Bleeding Red Flag', type: 'select', options: ['Yes', 'No'] },
  { key: 'redFlagSeverePelvicPain', label: 'Severe Pelvic Pain Red Flag', type: 'select', options: ['Yes', 'No'] },
  { key: 'redFlagFeverFoulDischarge', label: 'Fever / Foul Discharge Red Flag', type: 'select', options: ['Yes', 'No'] },
  { key: 'redFlagPregnancySuspected', label: 'Pregnancy Suspected Red Flag', type: 'select', options: ['Yes', 'No'] },
  { key: 'redFlagWeightLoss', label: 'Weight Loss Red Flag', type: 'select', options: ['Yes', 'No'] },
  { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
  {
    key: 'deliveryType',
    label: 'Mode of Delivery',
    type: 'select',
    options: ['Normal Vaginal', 'LSCS', 'Assisted Vaginal', 'Forceps / Vacuum'],
  },
  {
    key: 'weeksPostpartum',
    label: 'Weeks Postpartum',
    placeholder: '1 Week 4 Days',
  },
  {
    key: 'babyStatus',
    label: 'Baby Status',
    type: 'select',
    options: ['Healthy (Male)', 'Healthy (Female)', 'NICU', 'IUGR', 'Stillbirth'],
  },
  { key: 'birthWeight', label: 'Birth Weight', placeholder: '3.2 Kg' },
  {
    key: 'breastfeeding',
    label: 'Breastfeeding Status',
    type: 'select',
    options: ['Breastfeeding Well', 'Partial Breastfeeding', 'Not Breastfeeding', 'Difficulty Latching'],
  },
  {
    key: 'bleedingStatus',
    label: 'Lochia / Bleeding',
    type: 'select',
    options: ['Scanty (Normal)', 'Moderate', 'Heavy', 'Foul Smelling'],
  },
  {
    key: 'stitchesStatus',
    label: 'Wound / Episiotomy Status',
    type: 'select',
    options: ['Healing Well', 'Painful', 'Infected', 'Not Applicable'],
  },
  {
    key: 'postpartumPain',
    label: 'Postpartum Pain',
    type: 'select',
    options: ['None', 'Mild', 'Moderate', 'Severe'],
  },
  { key: 'postpartumFever', label: 'Fever', type: 'select', options: ['Yes', 'No'] },
  { key: 'urinaryComplaints', label: 'Urinary Complaints', type: 'select', options: ['Yes', 'No'] },
  {
    key: 'bowelStatus',
    label: 'Bowel Status',
    type: 'select',
    options: ['Normal', 'Constipation', 'Diarrhea'],
  },
  {
    key: 'uterineInvolution',
    label: 'Uterine Involution',
    type: 'select',
    options: ['Uterus well contracted', 'Subinvolution', 'Tender uterus'],
  },
  { key: 'postpartumBp', label: 'Postpartum BP', placeholder: '112/72 mmHg' },
  { key: 'postpartumWeight', label: 'Weight', placeholder: '64 Kg' },
  {
    key: 'epdsScore',
    label: 'Mood / Depression Screening (EPDS)',
    type: 'select',
    options: ['0 (Normal)', '1', '2', '3 (Normal)', '4', '5', '6', '7', '8', '9', '10+ (Refer)'],
  },
  { key: 'postnatalRemarks', label: 'Remarks', type: 'textarea', wide: true },
  { key: 'postpartumExamNotes', label: 'Postpartum Examination Notes', type: 'textarea', wide: true },
  { key: 'postnatalMedications', label: 'Medications', type: 'textarea', wide: true },
  { key: 'adviceToMother', label: 'Advice to Mother', type: 'textarea', wide: true },
  {
    key: 'familyPlanningCounseling',
    label: 'Family Planning / Contraception Counseling',
    type: 'textarea',
    wide: true,
  },
  { key: 'postnatalFollowUpPlan', label: 'Follow-up Plan', type: 'textarea', wide: true },
  { key: 'dangerHeavyBleedingCounselled', label: 'Heavy Bleeding Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'dangerFeverCounselled', label: 'Fever Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'dangerBreastPainCounselled', label: 'Breast Pain Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'dangerSevereHeadacheCounselled', label: 'Severe Headache Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'dangerWoundInfectionCounselled', label: 'Wound Infection Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'dangerFoulLochiaCounselled', label: 'Foul Lochia Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'dangerDepressionCounselled', label: 'Depression Counselled', type: 'select', options: ['Yes', 'No'] },
  { key: 'newbornPediatricVisit', label: 'Next Pediatric Visit', placeholder: '10 Jul 2026' },
  { key: 'newbornBcgOpv', label: 'BCG / OPV', placeholder: 'Due at 6 weeks' },
  { key: 'newbornVitaminD', label: 'Vitamin D Drops', placeholder: 'Daily' },
  { key: 'newbornWeightMonitoring', label: 'Weight Monitoring', placeholder: 'Weekly' },
  {
    key: 'lactationAdvice',
    label: 'Lactation Advice',
    type: 'textarea',
    wide: true,
    placeholder: 'Exclusive breastfeeding for 6 months. Feed on demand every 2-3 hours.',
  },
  {
    key: 'postnatalCounsellingNotes',
    label: 'Postnatal Counselling Notes',
    type: 'textarea',
    wide: true,
    placeholder: 'Nutrition, hygiene, pelvic floor exercises, rest and wound care discussed.',
  },
  { key: 'postnatalAdvice', label: 'Postnatal Advice', type: 'textarea', wide: true },
  { key: 'usgObstetric', label: 'USG Obstetric', type: 'select', options: ['Yes', 'No'] },
  { key: 'usgPelvis', label: 'USG Pelvis', type: 'select', options: ['Yes', 'No'] },
  { key: 'tvs', label: 'TVS', type: 'select', options: ['Yes', 'No'] },
  { key: 'follicularTracking', label: 'Follicular Tracking', type: 'select', options: ['Yes', 'No'] },
  { key: 'anomalyScan', label: 'Anomaly Scan', type: 'select', options: ['Yes', 'No'] },
  { key: 'growthScan', label: 'Growth Scan', type: 'select', options: ['Yes', 'No'] },
  { key: 'doppler', label: 'Doppler', type: 'select', options: ['Yes', 'No'] },
  { key: 'bpp', label: 'BPP', type: 'select', options: ['Yes', 'No'] },
  { key: 'ultrasoundNotes', label: 'Ultrasound Notes', type: 'textarea', wide: true },
  { key: 'chaperonePresent', label: 'Chaperone Present', type: 'select', options: ['Yes', 'No'] },
  { key: 'patientConsentTaken', label: 'Patient Consent Taken', type: 'select', options: ['Yes', 'No'] },
  { key: 'pelvicExamDone', label: 'Pelvic Examination', type: 'select', options: ['Done', 'Not Done'] },
  { key: 'gynaeNoteToPatient', label: 'Note to Patient', type: 'textarea', wide: true },
];

const ANTEPARTUM_FIELD_KEYS = new Set([
  'lmp', 'edd', 'gestationalAge', 'gravida', 'para', 'abortion', 'living',
  'previousCSection', 'fetalMovement', 'pvBleeding', 'painAbdomen',
  'urineSugar', 'urineAlbumin', 'edema', 'fundalHeight', 'fetalHeartRate', 'presentation',
  'pvExamination', 'antenatalOtherNotes', 'gynaeNoteToPatient',
  'antenatalDangerHeavyBleedingCounselled',
  'antenatalDangerFeverCounselled',
  'antenatalDangerSevereAbdominalPainCounselled',
  'antenatalDangerSevereVomitingCounselled',
  'antenatalDangerSevereHeadacheCounselled',
  'antenatalDangerDecreasedFetalMovementCounselled',
  'antenatalDangerSwellingHypertensionCounselled',
  'antenatalDangerConvulsionsCounselled',
]);

const GYNAE_PROBLEM_FIELD_KEYS = new Set([
  'lmp', 'cycleRegularity', 'cycleLength', 'durationOfFlow', 'amountOfBleeding', 'dysmenorrhea',
  'married', 'contraceptionHistory', 'infertilityDuration', 'lowerAbdominalPain', 'whiteDischarge',
  'postcoitalBleeding', 'urinarySymptoms', 'dyspareunia', 'menopauseStatus',
  'irregularPeriods', 'heavyBleeding', 'gynaeItching', 'gynaeBloating',
  'redFlagHeavyBleeding', 'redFlagPostmenopausalBleeding', 'redFlagSeverePelvicPain',
  'redFlagFeverFoulDischarge', 'redFlagPregnancySuspected', 'redFlagWeightLoss',
  'pelvicFindings', 'provisionalDiagnosis', 'treatmentPlan', 'gynecologyNotes',
  'pcosHistory', 'infertilityHistory', 'previousSurgery', 'papSmearRecord', 'breastExaminationNote',
]);

export const POSTNATAL_LAB_TESTS: Array<{ name: string; category: string }> = [
  { name: 'CBC', category: 'Hematology' },
  { name: 'Urine R/E', category: 'Urine' },
  { name: 'Ultrasound (If needed)', category: 'Radiology' },
  { name: 'TSH (If indicated)', category: 'Endocrinology' },
  { name: 'Blood Sugar (R)', category: 'Biochemistry' },
];

export const ANTEPARTUM_DANGER_SIGNS: Array<{ key: string; label: string }> = [
  { key: 'antenatalDangerHeavyBleedingCounselled', label: 'Heavy vaginal bleeding' },
  { key: 'antenatalDangerFeverCounselled', label: 'Fever' },
  { key: 'antenatalDangerSevereAbdominalPainCounselled', label: 'Severe abdominal pain' },
  { key: 'antenatalDangerSevereVomitingCounselled', label: 'Severe vomiting' },
  { key: 'antenatalDangerSevereHeadacheCounselled', label: 'Severe headache / blurred vision' },
  { key: 'antenatalDangerDecreasedFetalMovementCounselled', label: 'Decreased fetal movement' },
  { key: 'antenatalDangerSwellingHypertensionCounselled', label: 'Swelling of face / hands or hypertension' },
  { key: 'antenatalDangerConvulsionsCounselled', label: 'Convulsions / Fits' },
];

export const GYNAE_PROBLEM_COMPLAINTS: Array<{ key: string; label: string }> = [
  { key: 'irregularPeriods', label: 'Irregular Periods' },
  { key: 'lowerAbdominalPain', label: 'Lower Abdominal Pain' },
  { key: 'whiteDischarge', label: 'White Discharge' },
  { key: 'heavyBleeding', label: 'Heavy Bleeding' },
  { key: 'postcoitalBleeding', label: 'Postcoital Bleeding' },
  { key: 'gynaeItching', label: 'Itching' },
  { key: 'gynaeBloating', label: 'Bloating' },
];

export const GYNAE_PROBLEM_RED_FLAGS: Array<{ key: string; label: string }> = [
  { key: 'redFlagHeavyBleeding', label: 'Heavy bleeding (soaking pad < 1 hr)' },
  { key: 'redFlagPostmenopausalBleeding', label: 'Postmenopausal bleeding' },
  { key: 'redFlagSeverePelvicPain', label: 'Severe pelvic pain' },
  { key: 'redFlagFeverFoulDischarge', label: 'Fever / Foul discharge' },
  { key: 'redFlagPregnancySuspected', label: 'Pregnancy suspected' },
  { key: 'redFlagWeightLoss', label: 'Weight loss' },
];

export const ANTEPARTUM_DEFAULT_NOTE_TO_PATIENT =
  'Take iron and folic acid daily. Eat nutritious diet, drink plenty of fluids and take adequate rest. Report immediately if any danger signs occur.';

export const POSTNATAL_DANGER_SIGNS: Array<{ key: string; label: string }> = [
  { key: 'dangerHeavyBleedingCounselled', label: 'Heavy Bleeding (> 1 pad/hr)' },
  { key: 'dangerFeverCounselled', label: 'Fever (> 100.4°F)' },
  { key: 'dangerBreastPainCounselled', label: 'Breast Pain / Redness' },
  { key: 'dangerSevereHeadacheCounselled', label: 'Severe Headache' },
  { key: 'dangerWoundInfectionCounselled', label: 'Wound Infection (Redness, Discharge)' },
  { key: 'dangerFoulLochiaCounselled', label: 'Foul Smelling Lochia' },
  { key: 'dangerDepressionCounselled', label: 'Depression Symptoms' },
];

export const POSTNATAL_DEFAULT_LACTATION =
  'Exclusive breastfeeding for 6 months. Feed on demand every 2-3 hours. Ensure proper latch and alternate breasts.';

export const POSTNATAL_DEFAULT_COUNSELLING =
  'Nutrition, hygiene, pelvic floor exercises, rest and wound care discussed. Return immediately if danger signs appear.';

const POSTNATAL_FIELD_KEYS = new Set([
  'deliveryDate',
  'deliveryType',
  'weeksPostpartum',
  'babyStatus',
  'birthWeight',
  'breastfeeding',
  'bleedingStatus',
  'stitchesStatus',
  'postpartumPain',
  'postpartumFever',
  'urinaryComplaints',
  'bowelStatus',
  'uterineInvolution',
  'postpartumBp',
  'postpartumWeight',
  'epdsScore',
  'postnatalRemarks',
  'postpartumExamNotes',
  'postnatalMedications',
  'adviceToMother',
  'familyPlanningCounseling',
  'postnatalFollowUpPlan',
  'dangerHeavyBleedingCounselled',
  'dangerFeverCounselled',
  'dangerBreastPainCounselled',
  'dangerSevereHeadacheCounselled',
  'dangerWoundInfectionCounselled',
  'dangerFoulLochiaCounselled',
  'dangerDepressionCounselled',
  'gynaeNoteToPatient',
  'newbornPediatricVisit',
  'newbornBcgOpv',
  'newbornVitaminD',
  'newbornWeightMonitoring',
  'lactationAdvice',
  'postnatalCounsellingNotes',
  'postnatalAdvice',
]);

const PREGNANCY_RISKY_PATTERNS = [
  /\bisotretinoin\b/i,
  /\bwarfarin\b/i,
  /\bmethotrexate\b/i,
  /\blithium\b/i,
  /\bvalpro/i,
  /\bphenytoin\b/i,
  /\bcarbamazepine\b/i,
  /\btetracycline\b/i,
  /\bdoxycycline\b/i,
  /\bace[\s-]?inhibitor\b/i,
  /\blisinopril\b/i,
  /\benalapril\b/i,
  /\bnsaid\b/i,
  /\bibuprofen\b/i,
  /\bdiclofenac\b/i,
  /\baspirin\b/i,
  /\bstatins?\b/i,
  /\batorvastatin\b/i,
  /\bsimvastatin\b/i,
];

const PREGNANCY_SAFE_PATTERNS = [
  /\bfolic\b/i,
  /\biron\b/i,
  /\bcalcium\b/i,
  /\bparacetamol\b/i,
  /\bacetaminophen\b/i,
  /\bmetformin\b/i,
  /\binsulin\b/i,
];

export function parseIsoDate(value: string): Date | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateEddFromLmp(lmp: string): string {
  const date = parseIsoDate(lmp);
  if (!date) {
    return '';
  }

  const edd = new Date(date);
  edd.setDate(edd.getDate() + 280);
  return edd.toISOString().slice(0, 10);
}

export function calculateGestationalAgeFromLmp(lmp: string, referenceDate = new Date()): string {
  const date = parseIsoDate(lmp);
  if (!date) {
    return '';
  }

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000);

  if (diffDays < 0) {
    return '';
  }

  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  return `${weeks} weeks ${days} days`;
}

export function buildGpAlSummary(data: Record<string, unknown>): string {
  const gravida = String(data['gravida'] || '').trim();
  const para = String(data['para'] || '').trim();
  const abortion = String(data['abortion'] || '').trim();
  const living = String(data['living'] || '').trim();

  if (!gravida && !para && !abortion && !living) {
    return '';
  }

  return `G${gravida || '-'} P${para || '-'} A${abortion || '-'} L${living || '-'}`;
}

export function buildGynaeHistorySummary(data: Record<string, unknown>): string {
  const parts: string[] = [];
  const lmp = String(data['lmp'] || '').trim();
  const ga = String(data['gestationalAge'] || '').trim();
  const gpAl = buildGpAlSummary(data);

  if (lmp) {
    parts.push(`LMP: ${formatShortDate(lmp)}`);
  }

  if (ga) {
    parts.push(`GA: ${ga}`);
  }

  if (gpAl) {
    parts.push(gpAl);
  }

  const cycle = String(data['cycleRegularity'] || '').trim();
  if (cycle) {
    parts.push(`Cycle: ${cycle}`);
  }

  const pregnancyStatus = String(data['pregnancyStatus'] || '').trim();
  if (pregnancyStatus) {
    parts.push(`Pregnancy: ${pregnancyStatus}`);
  }

  return parts.join(' | ');
}

export function buildGynaeConsentSummary(data: Record<string, unknown>): string {
  const parts: string[] = [];
  if (String(data['patientConsentTaken'] || '').trim() === 'Yes') {
    parts.push('Consent taken');
  }
  if (String(data['chaperonePresent'] || '').trim() === 'Yes') {
    parts.push('Chaperone present during examination');
  }
  const pelvic = String(data['pelvicExamDone'] || '').trim();
  if (pelvic) {
    parts.push(`Pelvic examination ${pelvic.toLowerCase()}`);
  }
  return parts.join('. ');
}

const GYNAE_EDIT_SAMPLE_BY_MODE: Record<GynaeConsultMode, Record<string, string>> = {
  antenatal: {
    lmp: '2026-01-20',
    edd: '2026-10-27',
    gestationalAge: '22 weeks 3 days',
    gravida: '2',
    para: '1',
    abortion: '0',
    living: '1',
    previousCSection: 'No',
    fetalMovement: 'Present',
    pvBleeding: 'No',
    painAbdomen: 'No',
    urineAlbumin: 'Negative',
    urineSugar: 'Negative',
    edema: 'None',
    fundalHeight: '21',
    fetalHeartRate: '152 /min',
    presentation: 'Cephalic',
    pvExamination: 'Not indicated (22 weeks). Abdomen soft, uterus 20 weeks size.',
    antenatalOtherNotes: 'Routine ANC. Next anomaly scan advised at 24 weeks.',
    antenatalDangerHeavyBleedingCounselled: 'Yes',
    antenatalDangerFeverCounselled: 'Yes',
    antenatalDangerSevereAbdominalPainCounselled: 'Yes',
    antenatalDangerSevereVomitingCounselled: 'Yes',
    antenatalDangerSevereHeadacheCounselled: 'Yes',
    antenatalDangerDecreasedFetalMovementCounselled: 'Yes',
    antenatalDangerSwellingHypertensionCounselled: 'Yes',
    antenatalDangerConvulsionsCounselled: 'Yes',
    gynaeNoteToPatient: ANTEPARTUM_DEFAULT_NOTE_TO_PATIENT,
    chaperonePresent: 'Yes',
    patientConsentTaken: 'Yes',
    pelvicExamDone: 'Not Done',
  },
  gynae_problem: {
    lmp: '2026-05-20',
    cycleRegularity: 'Irregular',
    cycleLength: '35-45 days',
    durationOfFlow: '5 days',
    amountOfBleeding: 'Moderate',
    dysmenorrhea: 'Yes',
    married: 'Married',
    contraceptionHistory: 'Condom (Occasional)',
    infertilityDuration: '--',
    lowerAbdominalPain: 'Yes',
    whiteDischarge: 'Present',
    postcoitalBleeding: 'No',
    urinarySymptoms: 'No',
    dyspareunia: 'No',
    menopauseStatus: 'Pre-menopausal',
    irregularPeriods: 'Yes',
    heavyBleeding: 'No',
    gynaeItching: 'No',
    gynaeBloating: 'No',
    redFlagHeavyBleeding: 'No',
    redFlagPostmenopausalBleeding: 'No',
    redFlagSeverePelvicPain: 'No',
    redFlagFeverFoulDischarge: 'No',
    redFlagPregnancySuspected: 'No',
    redFlagWeightLoss: 'No',
    pelvicFindings:
      'Per speculum: Cervix healthy. Per vaginum: Uterus anteverted, normal size. No adnexal mass or tenderness.',
    provisionalDiagnosis: 'Ovulatory dysfunction (AUB-O).',
    treatmentPlan: 'Tab. Tranexamic Acid 500 mg TDS for 5 days during menses. Tab. Mefenamic Acid 500 mg BD PRN pain.',
    gynecologyNotes:
      'Counselled regarding cycle tracking and follow-up. Diet, exercise and stress management advised.',
    chaperonePresent: 'Yes',
    patientConsentTaken: 'Yes',
    pelvicExamDone: 'Done',
  },
  postnatal: {
    deliveryDate: '2026-06-01',
    deliveryType: 'LSCS',
    weeksPostpartum: '1 Week 4 Days',
    babyStatus: 'Healthy (Female)',
    birthWeight: '3.2 Kg',
    breastfeeding: 'Breastfeeding Well',
    bleedingStatus: 'Scanty (Normal)',
    stitchesStatus: 'Healing Well',
    postpartumPain: 'Mild',
    postpartumFever: 'No',
    urinaryComplaints: 'No',
    bowelStatus: 'Normal',
    uterineInvolution: 'Uterus well contracted',
    postpartumBp: '112/72 mmHg',
    postpartumWeight: '64 Kg',
    epdsScore: '3 (Normal)',
    postnatalRemarks: 'Patient doing well. Wound clean and dry. Lochia scanty.',
    postpartumExamNotes: 'Per abdomen soft, uterus well contracted. Episiotomy/LSCS wound healing well.',
    postnatalMedications: 'Tab. Iron 1 OD, Tab. Calcium 1 BD, Tab. Paracetamol 500 mg SOS pain.',
    adviceToMother: 'Rest, adequate fluids, nutritious diet, wound care and perineal hygiene.',
    familyPlanningCounseling: 'Counselled on spacing and contraception options after 6 weeks.',
    postnatalFollowUpPlan: 'Review after 2 weeks or earlier if danger signs.',
    dangerHeavyBleedingCounselled: 'Yes',
    dangerFeverCounselled: 'Yes',
    dangerBreastPainCounselled: 'Yes',
    dangerSevereHeadacheCounselled: 'Yes',
    dangerWoundInfectionCounselled: 'Yes',
    dangerFoulLochiaCounselled: 'Yes',
    dangerDepressionCounselled: 'Yes',
    newbornPediatricVisit: '10 Jul 2026',
    newbornBcgOpv: 'Due at 6 weeks',
    newbornVitaminD: 'Daily',
    newbornWeightMonitoring: 'Weekly',
    lactationAdvice: POSTNATAL_DEFAULT_LACTATION,
    postnatalCounsellingNotes: POSTNATAL_DEFAULT_COUNSELLING,
    gynaeNoteToPatient:
      'Take medicines as advised. Follow up after 2 weeks. Visit emergency if heavy bleeding, fever, severe pain or depression symptoms.',
    chaperonePresent: 'Yes',
    patientConsentTaken: 'Yes',
  },
};

export function buildGynaeEditSamplePatch(
  mode: GynaeConsultMode,
  current: Record<string, unknown>
): Record<string, string> {
  const samples = GYNAE_EDIT_SAMPLE_BY_MODE[mode] || {};
  const patch: Record<string, string> = {};

  Object.entries(samples).forEach(([key, value]) => {
    if (!String(current[key] || '').trim()) {
      patch[key] = value;
    }
  });

  return patch;
}

export function visibleGynaeFieldKeys(mode: GynaeConsultMode): Set<string> {
  if (mode === 'gynae_problem') {
    return GYNAE_PROBLEM_FIELD_KEYS;
  }

  if (mode === 'postnatal') {
    return POSTNATAL_FIELD_KEYS;
  }

  return ANTEPARTUM_FIELD_KEYS;
}

export function isPregnancyRiskyMedicine(name: string, instructions = ''): boolean {
  const source = `${name} ${instructions}`.trim();
  if (!source) {
    return false;
  }

  if (PREGNANCY_SAFE_PATTERNS.some((pattern) => pattern.test(source))) {
    return false;
  }

  return PREGNANCY_RISKY_PATTERNS.some((pattern) => pattern.test(source));
}

const GYNAE_BASE_FIELD_LABELS: Record<string, string> = {
  lmp: 'LMP',
  edd: 'EDD',
  gestationalAge: 'Gestational Age',
  gravida: 'Gravida (G)',
  para: 'Para (P)',
  abortion: 'Abortion (A)',
  living: 'Living (L)',
  fundalHeight: 'Fundal Height (cm)',
  fetalHeartRate: 'Fetal Heart Rate',
  gynaeBp: 'BP',
  gynaeWeight: 'Weight',
  pvExamination: 'Pelvic Exam / Findings',
};

const GYNAE_PRINT_SKIP_KEYS = new Set([
  'gynaeMode',
  'dangerHeavyBleedingCounselled',
  'dangerFeverCounselled',
  'dangerBreastPainCounselled',
  'dangerSevereHeadacheCounselled',
  'dangerWoundInfectionCounselled',
  'dangerFoulLochiaCounselled',
  'dangerDepressionCounselled',
  'antenatalDangerHeavyBleedingCounselled',
  'antenatalDangerFeverCounselled',
  'antenatalDangerSevereAbdominalPainCounselled',
  'antenatalDangerSevereVomitingCounselled',
  'antenatalDangerSevereHeadacheCounselled',
  'antenatalDangerDecreasedFetalMovementCounselled',
  'antenatalDangerSwellingHypertensionCounselled',
  'antenatalDangerConvulsionsCounselled',
  'redFlagHeavyBleeding',
  'redFlagPostmenopausalBleeding',
  'redFlagSeverePelvicPain',
  'redFlagFeverFoulDischarge',
  'redFlagPregnancySuspected',
  'redFlagWeightLoss',
  'usgObstetric',
  'usgPelvis',
  'tvs',
  'follicularTracking',
  'anomalyScan',
  'growthScan',
  'doppler',
  'bpp',
]);

function gynaeFieldLabel(key: string): string {
  const field = GYNAE_EXTRA_FIELDS.find((item) => item.key === key);
  return field?.label || GYNAE_BASE_FIELD_LABELS[key] || key;
}

export function normalizeGynaeConsultMode(value: unknown): GynaeConsultMode {
  const mode = String(value || 'antenatal').trim();
  if (mode === 'gynae_problem' || mode === 'postnatal') {
    return mode;
  }

  return 'antenatal';
}

function formatGynaePrintValue(key: string, value: string): string {
  if (['lmp', 'edd', 'deliveryDate'].includes(key)) {
    return formatShortDate(value);
  }

  if (key === 'gynaeMode') {
    const mode = normalizeGynaeConsultMode(value);
    return GYNAE_CONSULT_MODES.find((item) => item.key === mode)?.label || value;
  }

  return value;
}

function counselledLabels(
  data: Record<string, unknown>,
  signs: Array<{ key: string; label: string }>
): string {
  return signs
    .filter((sign) => String(data[sign.key] || '').trim() === 'Yes')
    .map((sign) => sign.label)
    .join(', ');
}

export function resolvePrescriptionConsultationPrintRows(
  source: Record<string, unknown>
): Array<{ label: string; value: string; wide?: boolean }> {
  const rows: Array<{ label: string; value: string; wide?: boolean }> = [];
  const push = (label: string, value: string, wide = false) => {
    const trimmed = String(value || '').trim();
    if (trimmed) {
      rows.push({ label, value: trimmed, wide });
    }
  };

  push('Chief Complaint', String(source['chiefComplaint'] || ''), true);
  push('History', String(source['history'] || ''), true);
  push('Examination', String(source['examination'] || ''), true);
  push('Diagnosis', String(source['diagnosis'] || ''));
  push('Advice / Notes', String(source['advice'] || ''), true);

  return rows;
}

export function resolveGynaeConsultationStripRows(
  source: Record<string, unknown>
): Array<{ label: string; value: string }> {
  return resolvePrescriptionConsultationPrintRows(source)
    .filter((row) => ['Chief Complaint', 'History', 'Examination'].includes(row.label))
    .map((row) => ({ label: row.label, value: row.value }));
}

const GYNAE_SIDEBAR_PRINT_KEYS: Record<GynaeConsultMode, string[]> = {
  antenatal: [
    'gynaeMode',
    'lmp',
    'edd',
    'gestationalAge',
    'gravida',
    'para',
    'abortion',
    'living',
    'previousCSection',
    'fetalMovement',
    'fundalHeight',
    'fetalHeartRate',
    'presentation',
    'urineAlbumin',
    'urineSugar',
    'edema',
  ],
  gynae_problem: [
    'gynaeMode',
    'lmp',
    'cycleRegularity',
    'cycleLength',
    'married',
    'amountOfBleeding',
    'dysmenorrhea',
    'menopauseStatus',
    'provisionalDiagnosis',
  ],
  postnatal: [
    'gynaeMode',
    'deliveryDate',
    'deliveryType',
    'weeksPostpartum',
    'babyStatus',
    'breastfeeding',
    'bleedingStatus',
    'postpartumBp',
  ],
};

export function splitGynaePrintRows(
  rows: Array<{ label: string; value: string; wide?: boolean }>,
  mode: GynaeConsultMode = 'antenatal'
): {
  sidebar: Array<{ label: string; value: string; wide?: boolean }>;
  extended: Array<{ label: string; value: string; wide?: boolean }>;
} {
  const sidebar: Array<{ label: string; value: string; wide?: boolean }> = [];
  const extended: Array<{ label: string; value: string; wide?: boolean }> = [];

  GYNAE_SIDEBAR_PRINT_KEYS[mode].forEach((key) => {
    const label = gynaeFieldLabel(key);
    const row = rows.find((item) => item.label === label);
    if (row && !/note to patient/i.test(row.label)) {
      sidebar.push(row);
    }
  });

  rows.forEach((row) => {
    if (/note to patient/i.test(row.label)) {
      return;
    }

    if (sidebar.some((item) => item.label === row.label)) {
      return;
    }

    extended.push(row);
  });

  return { sidebar, extended };
}

export function resolveGynaePatientNote(
  source: Record<string, unknown>,
  specialtyData: Record<string, unknown>
): string {
  const advice = String(source['advice'] || '').trim();
  const note = String(specialtyData['gynaeNoteToPatient'] || '').trim();

  if (note && advice && note !== advice) {
    return `${note}\n\n${advice}`;
  }

  return note || advice;
}

export function resolveGynaePrintRows(data: Record<string, unknown>): Array<{ label: string; value: string; wide?: boolean }> {
  const rows: Array<{ label: string; value: string; wide?: boolean }> = [];
  const push = (label: string, value: string, wide = false) => {
    const trimmed = String(value || '').trim();
    if (trimmed) {
      rows.push({ label, value: trimmed, wide });
    }
  };

  const mode = normalizeGynaeConsultMode(data['gynaeMode']);
  push('Consult Mode', formatGynaePrintValue('gynaeMode', mode));

  const fieldKeys = visibleGynaeFieldKeys(mode);
  fieldKeys.forEach((key) => {
    if (GYNAE_PRINT_SKIP_KEYS.has(key)) {
      return;
    }

    const value = String(data[key] || '').trim();
    if (!value) {
      return;
    }

    push(gynaeFieldLabel(key), formatGynaePrintValue(key, value), /Notes|Advice|Plan|Findings|Remarks|Counsel|Examination|Diagnosis|Treatment|History|Patient/i.test(gynaeFieldLabel(key)));
  });

  if (mode === 'antenatal') {
    const counselled = counselledLabels(data, ANTEPARTUM_DANGER_SIGNS);
    if (counselled) {
      push('Danger Signs (Counselled)', counselled, true);
    }
  }

  if (mode === 'gynae_problem') {
    const complaints = GYNAE_PROBLEM_COMPLAINTS.filter(
      (item) => String(data[item.key] || '').trim() === 'Yes'
    ).map((item) => item.label);
    if (complaints.length > 0) {
      push('Common Complaints', complaints.join(', '), true);
    }

    const redFlags = counselledLabels(data, GYNAE_PROBLEM_RED_FLAGS);
    if (redFlags) {
      push('Red Flag Checklist', redFlags, true);
    }
  }

  if (mode === 'postnatal') {
    const counselled = counselledLabels(data, POSTNATAL_DANGER_SIGNS);
    if (counselled) {
      push('Danger Signs (Counselled)', counselled, true);
    }
  }

  const ultrasoundStudies = GYNAE_ULTRASOUND_STUDIES.filter(
    (study) => String(data[study.key] || '').trim() === 'Yes'
  ).map((study) => study.label);
  if (ultrasoundStudies.length > 0) {
    push('Ultrasound Studies', ultrasoundStudies.join(', '), true);
  }

  push('Ultrasound Notes', String(data['ultrasoundNotes'] || ''), true);
  push('Examination Consent', buildGynaeConsentSummary(data), true);

  return rows;
}

function formatShortDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) {
    return value;
  }

  return date.toLocaleDateString('en-GB');
}

export function mergeGynaeLabCatalog(
  baseCatalog: Array<{ name: string; category: string }>
): Array<{ name: string; category: string }> {
  const merged = [...baseCatalog];
  const names = new Set(baseCatalog.map((item) => item.name.toLowerCase()));

  GYNAE_LAB_CATALOG.forEach((item) => {
    if (!names.has(item.name.toLowerCase())) {
      merged.push({ name: item.name, category: item.category });
      names.add(item.name.toLowerCase());
    }
  });

  return merged;
}
