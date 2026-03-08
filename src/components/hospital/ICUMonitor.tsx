import { useState, useEffect, useRef, useCallback } from 'react';
import { getICUPatients, playCriticalAlarm, playBeep, type ICUPatient, type VitalRecord } from '@/lib/icuPatientData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Heart, Wind, Thermometer, Activity, AlertTriangle, Volume2, VolumeX, MonitorSpeaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

const WINDOW_SIZE = 60; // show last 60 records in chart
const TICK_INTERVAL = 1500; // advance every 1.5s for snappy feel

export default function ICUMonitor() {
  const [patients] = useState<ICUPatient[]>(() => getICUPatients());
  const [selectedId, setSelectedId] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const lastBeepRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const patient = patients.find(p => p.id === selectedId)!;
  const record = patient.records[currentIndex];
  const windowStart = Math.max(0, currentIndex - WINDOW_SIZE + 1);
  const chartData = patient.records.slice(windowStart, currentIndex + 1).map((r, i) => ({
    idx: i,
    hr: r.heartRate,
    spo2: r.spo2,
    sbp: r.systolicBP,
    rr: r.respiratoryRate,
  }));

  // Advance index
  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        return next >= patient.records.length ? 0 : next;
      });
    }, TICK_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, patient.records.length]);

  // Reset index on patient change
  useEffect(() => { setCurrentIndex(0); }, [selectedId]);

  // Heart beep on every tick + critical alarm
  useEffect(() => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastBeepRef.current < 400) return;
    lastBeepRef.current = now;

    if (record?.isCritical) {
      playCriticalAlarm();
    } else {
      // Soft heart beep proportional to HR
      playBeep(600, 60);
    }
  }, [currentIndex, soundEnabled, record?.isCritical]);

  const formatTime = useCallback((idx: number) => {
    const r = patient.records[idx];
    if (!r) return '--:--';
    const totalSec = Math.floor(r.timestamp / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [patient.records]);

  if (!record) return null;

  const vitalCards = [
    { label: 'HR', value: Math.round(record.heartRate), unit: 'bpm', icon: Heart, color: 'hsl(0, 80%, 55%)', critical: record.heartRate > 150 || record.heartRate < 40 },
    { label: 'SpO₂', value: record.spo2.toFixed(1), unit: '%', icon: Activity, color: 'hsl(200, 80%, 55%)', critical: record.spo2 < 88 },
    { label: 'BP', value: `${record.systolicBP}/${record.diastolicBP}`, unit: 'mmHg', icon: Activity, color: 'hsl(40, 80%, 55%)', critical: record.systolicBP < 80 || record.systolicBP > 200 },
    { label: 'RR', value: record.respiratoryRate, unit: '/min', icon: Wind, color: 'hsl(170, 60%, 50%)', critical: record.respiratoryRate > 35 || record.respiratoryRate < 8 },
    { label: 'Temp', value: record.temperature.toFixed(1), unit: '°C', icon: Thermometer, color: 'hsl(280, 60%, 55%)', critical: record.temperature > 39.5 },
    { label: 'EtCO₂', value: record.etCO2, unit: 'mmHg', icon: Wind, color: 'hsl(120, 50%, 50%)', critical: false },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar: patient selector + controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <MonitorSpeaker className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-bold text-foreground">ICU Monitor</h2>
        </div>

        <Select value={String(selectedId)} onValueChange={v => setSelectedId(Number(v))}>
          <SelectTrigger className="w-[260px] border-border bg-card text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {patients.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{p.bed}</span>
                  <span>{p.name}</span>
                  <span className="text-muted-foreground text-xs">({p.age}{p.gender})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline" className="border-border text-muted-foreground text-xs font-mono">
          {patient.diagnosis}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            T: {formatTime(currentIndex)} &middot; {currentIndex + 1}/{patient.records.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </Button>
        </div>
      </div>

      {/* Critical alert banner */}
      {record.isCritical && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 animate-pulse">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">CRITICAL — Vitals outside safe range</span>
        </div>
      )}

      {/* Vital number cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {vitalCards.map(v => (
          <div
            key={v.label}
            className={`relative rounded-xl border p-3 text-center transition-all ${
              v.critical
                ? 'border-destructive/50 bg-destructive/10 animate-pulse'
                : 'border-border bg-card/60'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{v.label}</p>
            <p className="font-mono text-2xl font-bold" style={{ color: v.critical ? 'hsl(0, 80%, 60%)' : v.color }}>
              {v.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{v.unit}</p>
          </div>
        ))}
      </div>

      {/* Waveform charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <WaveformChart title="Heart Rate" data={chartData} dataKey="hr" color="hsl(0, 80%, 55%)" criticalHigh={150} criticalLow={40} unit="bpm" />
        <WaveformChart title="SpO₂" data={chartData} dataKey="spo2" color="hsl(200, 80%, 55%)" criticalLow={88} unit="%" domain={[70, 100]} />
        <WaveformChart title="Systolic BP" data={chartData} dataKey="sbp" color="hsl(40, 80%, 55%)" criticalHigh={200} criticalLow={80} unit="mmHg" />
        <WaveformChart title="Respiratory Rate" data={chartData} dataKey="rr" color="hsl(170, 60%, 50%)" criticalHigh={35} criticalLow={8} unit="/min" />
      </div>
    </div>
  );
}

function WaveformChart({
  title, data, dataKey, color, criticalHigh, criticalLow, unit, domain,
}: {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  criticalHigh?: number;
  criticalLow?: number;
  unit: string;
  domain?: [number, number];
}) {
  return (
    <div className="rounded-xl border border-border bg-[hsl(210,18%,9%)] p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        <span className="font-mono text-xs" style={{ color }}>
          {data.length > 0 ? data[data.length - 1][dataKey] : '--'} {unit}
        </span>
      </div>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="idx" hide />
            <YAxis domain={domain || ['auto', 'auto']} tick={{ fontSize: 9, fill: 'hsl(210,10%,40%)' }} axisLine={false} tickLine={false} />
            {criticalHigh && <ReferenceLine y={criticalHigh} stroke="hsl(0,60%,40%)" strokeDasharray="3 3" strokeWidth={1} />}
            {criticalLow && <ReferenceLine y={criticalLow} stroke="hsl(0,60%,40%)" strokeDasharray="3 3" strokeWidth={1} />}
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
