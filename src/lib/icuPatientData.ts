/**
 * Synthetic ICU patient data generator.
 * Generates 5,000 timestamped records per patient (10 patients).
 * Each record represents vitals sampled every ~5-10 seconds.
 */

export interface VitalRecord {
  timestamp: number; // ms offset from start
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  spo2: number;
  respiratoryRate: number;
  temperature: number;
  etCO2: number;
  isCritical: boolean;
}

export interface ICUPatient {
  id: number;
  name: string;
  age: number;
  gender: 'M' | 'F';
  diagnosis: string;
  bed: string;
  records: VitalRecord[];
}

const PATIENT_PROFILES = [
  { name: 'James Carter', age: 72, gender: 'M' as const, diagnosis: 'Sepsis', bed: 'ICU-01' },
  { name: 'Maria Gonzalez', age: 58, gender: 'F' as const, diagnosis: 'ARDS', bed: 'ICU-02' },
  { name: 'Robert Chen', age: 65, gender: 'M' as const, diagnosis: 'Post-CABG', bed: 'ICU-03' },
  { name: 'Aisha Patel', age: 45, gender: 'F' as const, diagnosis: 'DKA', bed: 'ICU-04' },
  { name: 'Thomas Wilson', age: 81, gender: 'M' as const, diagnosis: 'Pneumonia', bed: 'ICU-05' },
  { name: 'Elena Novak', age: 39, gender: 'F' as const, diagnosis: 'Trauma', bed: 'ICU-06' },
  { name: 'David Kim', age: 67, gender: 'M' as const, diagnosis: 'CHF Exacerbation', bed: 'ICU-07' },
  { name: 'Sarah Okonkwo', age: 54, gender: 'F' as const, diagnosis: 'Acute Liver Failure', bed: 'ICU-08' },
  { name: 'Michael Brown', age: 76, gender: 'M' as const, diagnosis: 'Stroke', bed: 'ICU-09' },
  { name: 'Priya Sharma', age: 48, gender: 'F' as const, diagnosis: 'PE', bed: 'ICU-10' },
];

// Seeded PRNG for reproducibility
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function generatePatientRecords(patientIndex: number, count: number = 5000): VitalRecord[] {
  const rng = mulberry32(42 + patientIndex * 137);
  const records: VitalRecord[] = [];

  // Base vitals per patient (some sicker than others)
  const sickness = 0.3 + rng() * 0.5; // 0.3-0.8
  let hr = 70 + sickness * 40 + (rng() - 0.5) * 10;
  let sbp = 130 - sickness * 40 + (rng() - 0.5) * 10;
  let dbp = 75 - sickness * 15 + (rng() - 0.5) * 5;
  let spo2 = 98 - sickness * 8 + (rng() - 0.5) * 2;
  let rr = 14 + sickness * 12 + (rng() - 0.5) * 3;
  let temp = 37.0 + sickness * 1.5 + (rng() - 0.5) * 0.3;
  let etco2 = 38 + (rng() - 0.5) * 6;

  let timeMs = 0;

  for (let i = 0; i < count; i++) {
    // Random walk with mean reversion
    const drift = (rng() - 0.5) * 2;
    hr = clamp(hr + (rng() - 0.5) * 4 + drift * 0.5, 35, 200);
    sbp = clamp(sbp + (rng() - 0.5) * 5, 60, 220);
    dbp = clamp(dbp + (rng() - 0.5) * 3, 30, 130);
    spo2 = clamp(spo2 + (rng() - 0.5) * 1.5, 70, 100);
    rr = clamp(rr + (rng() - 0.5) * 2, 6, 45);
    temp = clamp(temp + (rng() - 0.5) * 0.1, 34, 41);
    etco2 = clamp(etco2 + (rng() - 0.5) * 2, 15, 60);

    // Occasional critical episodes (spikes)
    if (rng() < 0.02) {
      // Critical event
      const eventType = Math.floor(rng() * 4);
      if (eventType === 0) { hr = clamp(hr + 40, 35, 200); spo2 = clamp(spo2 - 8, 70, 100); }
      if (eventType === 1) { sbp = clamp(sbp - 30, 60, 220); }
      if (eventType === 2) { spo2 = clamp(spo2 - 12, 70, 100); }
      if (eventType === 3) { rr = clamp(rr + 15, 6, 45); temp = clamp(temp + 1, 34, 41); }
    }

    // Recovery tendency
    if (hr > 140) hr -= rng() * 3;
    if (spo2 < 88) spo2 += rng() * 2;
    if (sbp < 80) sbp += rng() * 4;

    const isCritical =
      hr > 150 || hr < 40 ||
      spo2 < 88 ||
      sbp < 80 || sbp > 200 ||
      rr > 35 || rr < 8 ||
      temp > 39.5;

    records.push({
      timestamp: timeMs,
      heartRate: Math.round(hr * 10) / 10,
      systolicBP: Math.round(sbp),
      diastolicBP: Math.round(dbp),
      spo2: Math.round(spo2 * 10) / 10,
      respiratoryRate: Math.round(rr),
      temperature: Math.round(temp * 10) / 10,
      etCO2: Math.round(etco2),
      isCritical,
    });

    // 5-10 second intervals
    timeMs += 5000 + Math.floor(rng() * 5000);
  }

  return records;
}

let _cachedPatients: ICUPatient[] | null = null;

export function getICUPatients(): ICUPatient[] {
  if (_cachedPatients) return _cachedPatients;

  _cachedPatients = PATIENT_PROFILES.map((p, i) => ({
    id: i + 1,
    ...p,
    records: generatePatientRecords(i),
  }));

  return _cachedPatients;
}

export function playBeep(frequency = 880, duration = 150) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = frequency;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000 + 0.01);
    setTimeout(() => ctx.close(), duration + 100);
  } catch {
    // Audio not available
  }
}

export function playCriticalAlarm() {
  playBeep(880, 120);
  setTimeout(() => playBeep(660, 120), 180);
  setTimeout(() => playBeep(880, 120), 360);
}
