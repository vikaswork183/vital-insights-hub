import { useState, useRef, useCallback } from 'react';
import { useData } from '@/context/DataProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload, FileSpreadsheet, Brain, Lock, ShieldCheck, CheckCircle2,
  XCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

type PipelineStage = 'idle' | 'parsing' | 'training' | 'encrypting' | 'validating' | 'submitting' | 'done' | 'error';

interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  loss: number;
  epochs: number;
  samples: number;
  features: number;
}

interface EncryptionLog {
  timestamp: string;
  action: string;
  detail: string;
  status: 'ok' | 'info';
}

interface AggregationCheck {
  label: string;
  threshold: string;
  value: string;
  pass: boolean;
}

// Simulate parsing a CSV
function parseCSV(text: string) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim()));
  return { headers, rows, rowCount: rows.length, colCount: headers.length };
}

// Clinical valid ranges for aggregation checks
const CLINICAL_RANGES: Record<string, { min: number; max: number; meanLow: number; meanHigh: number; stdMax: number }> = {
  age:              { min: 0, max: 120, meanLow: 18, meanHigh: 95, stdMax: 30 },
  heart_rate:       { min: 30, max: 220, meanLow: 50, meanHigh: 130, stdMax: 40 },
  systolic_bp:      { min: 50, max: 260, meanLow: 80, meanHigh: 180, stdMax: 50 },
  diastolic_bp:     { min: 25, max: 180, meanLow: 40, meanHigh: 120, stdMax: 35 },
  map:              { min: 30, max: 190, meanLow: 55, meanHigh: 140, stdMax: 35 },
  respiratory_rate: { min: 6, max: 50, meanLow: 10, meanHigh: 35, stdMax: 12 },
  spo2:             { min: 60, max: 100, meanLow: 85, meanHigh: 100, stdMax: 10 },
  temperature:      { min: 33, max: 42, meanLow: 35.5, meanHigh: 39.5, stdMax: 2.0 },
  gcs_total:        { min: 3, max: 15, meanLow: 5, meanHigh: 15, stdMax: 5 },
  creatinine:       { min: 0, max: 20, meanLow: 0.3, meanHigh: 8, stdMax: 5 },
  bun:              { min: 0, max: 150, meanLow: 5, meanHigh: 80, stdMax: 40 },
  glucose:          { min: 20, max: 800, meanLow: 60, meanHigh: 350, stdMax: 150 },
  wbc:              { min: 0.5, max: 80, meanLow: 3, meanHigh: 30, stdMax: 15 },
  hemoglobin:       { min: 3, max: 22, meanLow: 6, meanHigh: 18, stdMax: 4 },
  platelets:        { min: 5, max: 800, meanLow: 50, meanHigh: 450, stdMax: 200 },
  lactate:          { min: 0, max: 25, meanLow: 0.5, meanHigh: 10, stdMax: 6 },
};

function computeColumnStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { min: 0, max: 0, mean: 0, std: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { min, max, mean, std };
}

// Analyze the actual CSV data for training metrics
function analyzeTraining(headers: string[], rows: string[][]): TrainingMetrics {
  const mortalityIdx = headers.indexOf('mortality');
  const numRows = rows.length;
  const numFeatures = headers.filter(h => h !== 'mortality').length;

  if (mortalityIdx === -1) {
    // No mortality column — generic metrics
    const base = Math.min(0.88, 0.65 + (numRows / 15000) * 0.15);
    return {
      accuracy: base, precision: base - 0.03, recall: base - 0.02,
      f1: base - 0.025, auc: base + 0.02, loss: 0.5 - base * 0.4,
      epochs: 25, samples: numRows, features: numFeatures,
    };
  }

  const labels = rows.map(r => parseFloat(r[mortalityIdx])).filter(v => !isNaN(v));
  const mortalityRate = labels.reduce((a, b) => a + b, 0) / labels.length;

  // Malicious datasets with flipped labels / extreme mortality produce worse models
  const labelQuality = (mortalityRate >= 0.08 && mortalityRate <= 0.60) ? 1.0 : 0.5;
  
  // Check for outliers in features
  let outlierPenalty = 0;
  for (const [col, ranges] of Object.entries(CLINICAL_RANGES)) {
    const idx = headers.indexOf(col);
    if (idx === -1) continue;
    const vals = rows.map(r => parseFloat(r[idx])).filter(v => !isNaN(v));
    if (vals.length === 0) continue;
    const stats = computeColumnStats(vals);
    if (stats.max > ranges.max * 1.1 || stats.min < ranges.min * 0.9) outlierPenalty += 0.02;
    if (stats.mean < ranges.meanLow || stats.mean > ranges.meanHigh) outlierPenalty += 0.01;
    if (stats.std > ranges.stdMax * 1.5) outlierPenalty += 0.015;
  }

  const base = Math.min(0.92, 0.7 + (numRows / 15000) * 0.12) * labelQuality - Math.min(0.2, outlierPenalty);
  const noise = () => (Math.random() - 0.5) * 0.02;

  return {
    accuracy: Math.max(0.35, Math.min(0.99, base + noise())),
    precision: Math.max(0.30, Math.min(0.99, base - 0.02 + noise())),
    recall: Math.max(0.30, Math.min(0.99, base - 0.01 + noise())),
    f1: Math.max(0.30, Math.min(0.99, base - 0.015 + noise())),
    auc: Math.max(0.35, Math.min(0.99, base + 0.03 + noise())),
    loss: Math.max(0.05, 0.6 - base * 0.4 + noise() * 0.1),
    epochs: 25,
    samples: numRows,
    features: numFeatures,
  };
}

// Run actual aggregation checks on CSV data
function runAggregationChecks(
  headers: string[],
  rows: string[][]
): { checks: AggregationCheck[]; trustScore: number; l2Norm: number; outlierPct: number; flaggedFeatures: string[] } {
  const mortalityIdx = headers.indexOf('mortality');
  const numRows = rows.length;
  const flaggedFeatures: string[] = [];

  // 1. Simulated L2 norm — larger deltas for more anomalous data
  let normPenalty = 0;

  // 2. Clinical outlier analysis
  let totalChecks = 0;
  let outlierChecks = 0;

  for (const [col, ranges] of Object.entries(CLINICAL_RANGES)) {
    const idx = headers.indexOf(col);
    if (idx === -1) continue;
    const vals = rows.map(r => parseFloat(r[idx])).filter(v => !isNaN(v));
    if (vals.length === 0) continue;
    const stats = computeColumnStats(vals);

    // Range check (tight 10% tolerance)
    totalChecks++;
    if (stats.min < ranges.min * 0.9 || stats.max > ranges.max * 1.1) {
      outlierChecks++;
      flaggedFeatures.push(`${col}: range [${stats.min.toFixed(1)}, ${stats.max.toFixed(1)}] outside valid [${ranges.min}, ${ranges.max}]`);
      normPenalty += 0.15;
    }

    // Mean check
    totalChecks++;
    if (stats.mean < ranges.meanLow || stats.mean > ranges.meanHigh) {
      outlierChecks++;
      flaggedFeatures.push(`${col}: mean ${stats.mean.toFixed(2)} outside [${ranges.meanLow}, ${ranges.meanHigh}]`);
      normPenalty += 0.1;
    }

    // Std check
    totalChecks++;
    if (stats.std > ranges.stdMax * 1.5) {
      outlierChecks++;
      flaggedFeatures.push(`${col}: std ${stats.std.toFixed(2)} exceeds max ${(ranges.stdMax * 1.5).toFixed(1)}`);
      normPenalty += 0.1;
    }

    // Constant data check
    if (stats.std < 0.01 && ranges.stdMax > 1) {
      totalChecks++;
      outlierChecks++;
      flaggedFeatures.push(`${col}: suspiciously constant (std=${stats.std.toFixed(4)})`);
    }
  }

  const outlierPct = totalChecks > 0 ? outlierChecks / totalChecks : 0;
  const outlierPass = outlierPct <= 0.10;

  // 3. Label distribution check
  let mortalityRate = 0.15; // default
  let labelPass = true;
  let labelMsg = '';
  if (mortalityIdx !== -1) {
    const labels = rows.map(r => parseFloat(r[mortalityIdx])).filter(v => !isNaN(v));
    mortalityRate = labels.reduce((a, b) => a + b, 0) / labels.length;
    if (mortalityRate < 0.08) {
      labelPass = false;
      labelMsg = `Mortality rate too low: ${(mortalityRate * 100).toFixed(1)}% (min 8%)`;
    } else if (mortalityRate > 0.60) {
      labelPass = false;
      labelMsg = `Mortality rate too high: ${(mortalityRate * 100).toFixed(1)}% (max 60%)`;
    } else {
      labelMsg = `Mortality rate: ${(mortalityRate * 100).toFixed(1)}%`;
    }
  }

  // 4. L2 norm (simulated based on data anomalies)
  const l2Norm = Math.min(3.0, 0.2 + normPenalty + (Math.random() * 0.1));
  const normPass = l2Norm <= 1.0;
  const wasClipped = l2Norm > 1.0;

  // 5. Key fingerprint (always passes for frontend simulation)
  const keyMatch = true;

  // 6. Dataset size check
  const sizePass = numRows >= 50;

  // 7. Trust score computation (mirrors backend logic)
  // Norm score: 25 pts
  let normScore: number;
  if (wasClipped) {
    normScore = Math.max(0, 5 * (1 - (l2Norm - 1.0) / 2.0));
  } else if (l2Norm <= 0.3) {
    normScore = 25;
  } else if (l2Norm <= 0.7) {
    normScore = 25 * (1 - (l2Norm - 0.3) / 0.8);
  } else {
    normScore = Math.max(5, 25 * (1 - (l2Norm - 0.3) / 0.7) * 0.5);
  }

  // Key score: 20 pts
  const keyScore = keyMatch ? 20 : 0;

  // Outlier score: 25 pts
  let outlierScore: number;
  if (outlierPct <= 0.05) {
    outlierScore = 25;
  } else if (outlierPct <= 0.10) {
    outlierScore = 25 * (1 - (outlierPct - 0.05) / 0.10);
  } else if (outlierPct <= 0.20) {
    outlierScore = Math.max(0, 12 * (1 - (outlierPct - 0.10) / 0.10));
  } else {
    outlierScore = 0;
  }

  // Label score: 15 pts
  const labelScore = labelPass ? 15 : 0;

  // Size score: 15 pts
  let sizeScore: number;
  if (numRows < 50) sizeScore = 0;
  else if (numRows < 100) sizeScore = 5;
  else if (numRows < 500) sizeScore = 5 + 10 * (numRows - 100) / 400;
  else sizeScore = 15;

  const trustScore = Math.round(normScore + keyScore + outlierScore + labelScore + sizeScore);

  const checks: AggregationCheck[] = [
    { label: 'L2 Norm Clipping', threshold: '≤ 1.0', value: l2Norm.toFixed(4), pass: normPass },
    { label: 'Key Fingerprint', threshold: 'Match', value: keyMatch ? 'Verified ✓' : 'MISMATCH', pass: keyMatch },
    { label: 'Clinical Outliers', threshold: '≤ 10%', value: `${(outlierPct * 100).toFixed(1)}%`, pass: outlierPass },
    { label: 'Trust Score', threshold: '≥ 70', value: trustScore.toString(), pass: trustScore >= 70 },
    { label: 'Label Distribution', threshold: '8-60%', value: `${(mortalityRate * 100).toFixed(1)}%`, pass: labelPass },
    { label: 'Dataset Size', threshold: '≥ 50', value: numRows.toString(), pass: sizePass },
  ];

  return { checks, trustScore, l2Norm, outlierPct, flaggedFeatures };
}

export default function TrainAndUpload() {
  const { user, profile, modelVersions, refreshUpdateRequests } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<PipelineStage>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [csvInfo, setCsvInfo] = useState<{ rowCount: number; colCount: number; headers: string[] } | null>(null);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [encLogs, setEncLogs] = useState<EncryptionLog[]>([]);
  const [aggResult, setAggResult] = useState<ReturnType<typeof simulateAggregation> | null>(null);
  const [showEncLogs, setShowEncLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setStage('idle');
    setProgress(0);
    setFileName('');
    setCsvInfo(null);
    setMetrics(null);
    setEncLogs([]);
    setAggResult(null);
    setShowEncLogs(false);
    setErrorMsg('');
  };

  const animateProgress = (from: number, to: number, durationMs: number) =>
    new Promise<void>((resolve) => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(1, elapsed / durationMs);
        setProgress(from + (to - from) * pct);
        if (pct < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large (max 20 MB)');
      return;
    }

    try {
      reset();
      setFileName(file.name);

      // ── Stage 1: Parse CSV ──
      setStage('parsing');
      setProgress(0);
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.rowCount < 10) {
        throw new Error('Dataset must have at least 10 rows');
      }
      setCsvInfo({ rowCount: parsed.rowCount, colCount: parsed.colCount, headers: parsed.headers });
      await animateProgress(0, 15, 800);

      // ── Stage 2: Train local model ──
      setStage('training');
      const trainedMetrics = simulateTraining(parsed.rowCount, parsed.colCount);
      await animateProgress(15, 55, 2500);
      setMetrics(trainedMetrics);

      // ── Stage 3: Encrypt model delta ──
      setStage('encrypting');
      const logs = simulateEncryption();
      for (let i = 0; i < logs.length; i++) {
        await new Promise(r => setTimeout(r, 200));
        setEncLogs(prev => [...prev, logs[i]]);
      }
      await animateProgress(55, 75, 1400);

      // ── Stage 4: Validate (aggregation checks) ──
      setStage('validating');
      const agg = simulateAggregation();
      await animateProgress(75, 90, 1200);
      setAggResult(agg);

      // ── Stage 5: Submit to database ──
      setStage('submitting');
      const modelVersion = modelVersions[0];
      if (!modelVersion || !user) throw new Error('No model version available');

      const { error } = await supabase.from('update_requests').insert({
        hospital_id: user.id,
        hospital_name: profile?.hospital_name || profile?.full_name || user.email || 'Unknown',
        model_version_id: modelVersion.id,
        trust_score: agg.trustScore,
        l2_norm: agg.l2Norm,
        clinical_outlier_pct: agg.outlierPct,
        key_fingerprint_match: true,
        label_distribution: { 'Survived': 0.65, 'Mortality': 0.35 },
        diagnostics: {
          local_accuracy: trainedMetrics.accuracy,
          local_f1: trainedMetrics.f1,
          local_auc: trainedMetrics.auc,
          feature_checks: {
            'Heart Rate': 92, 'Blood Pressure': 88, 'SpO2': 95,
            'GCS': 90, 'Lab Values': 85, 'Temperature': 93,
          },
        },
        status: agg.trustScore >= 70 ? 'pending' : 'rejected',
        rejection_reason: agg.trustScore < 70 ? 'Trust score below threshold' : null,
      });

      if (error) throw error;
      await animateProgress(90, 100, 600);
      setStage('done');
      await refreshUpdateRequests();
      toast.success('Model update submitted successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Pipeline failed');
      setStage('error');
      toast.error(err.message || 'Pipeline failed');
    }
  }, [modelVersions, user, profile, refreshUpdateRequests]);

  const stageLabels: Record<PipelineStage, string> = {
    idle: 'Ready', parsing: 'Parsing CSV…', training: 'Training local model…',
    encrypting: 'Encrypting model delta…', validating: 'Running aggregation checks…',
    submitting: 'Submitting update…', done: 'Complete', error: 'Failed',
  };

  const isRunning = !['idle', 'done', 'error'].includes(stage);

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-cyan to-teal" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">Train & Upload Model Update</h3>
              <p className="text-sm text-muted-foreground">Upload a patient CSV → train locally → encrypt → validate → submit</p>
            </div>
          </div>

          {stage === 'idle' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/30 p-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">Click to upload CSV dataset</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .csv files up to 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {stage === 'done' && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {stage === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm font-semibold text-foreground">{stageLabels[stage]}</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{fileName}</span>
              </div>
              <Progress value={progress} className="h-2" />

              {/* CSV info */}
              {csvInfo && (
                <div className="flex gap-3 flex-wrap">
                  {[
                    { label: 'Rows', value: csvInfo.rowCount.toLocaleString() },
                    { label: 'Features', value: (csvInfo.colCount - 1).toString() },
                    { label: 'Columns', value: csvInfo.headers.slice(0, 5).join(', ') + (csvInfo.headers.length > 5 ? '…' : '') },
                  ].map(i => (
                    <Badge key={i.label} variant="outline" className="border-border bg-secondary/50 text-xs font-mono">
                      {i.label}: {i.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {(stage === 'done' || stage === 'error') && (
            <Button onClick={reset} variant="outline" size="sm" className="mt-4">
              Upload Another Dataset
            </Button>
          )}
        </div>
      </div>

      {/* Local Model Accuracy */}
      {metrics && (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-success via-teal to-primary" />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-success/20 bg-success/10">
                <Brain className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Local Model Performance</h3>
                <p className="text-sm text-muted-foreground">{metrics.epochs} epochs · {metrics.samples.toLocaleString()} samples · {metrics.features} features</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Accuracy', value: (metrics.accuracy * 100).toFixed(1) + '%', color: 'primary' },
                { label: 'Precision', value: (metrics.precision * 100).toFixed(1) + '%', color: 'primary' },
                { label: 'Recall', value: (metrics.recall * 100).toFixed(1) + '%', color: 'primary' },
                { label: 'F1 Score', value: (metrics.f1 * 100).toFixed(1) + '%', color: 'primary' },
                { label: 'AUC-ROC', value: (metrics.auc * 100).toFixed(1) + '%', color: 'teal' },
                { label: 'Loss', value: metrics.loss.toFixed(4), color: 'warning' },
              ].map(m => (
                <div key={m.label} className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <p className={`mt-1 font-heading text-xl font-bold text-${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Encryption Logs */}
      {encLogs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-warning via-primary to-teal" />
          <div className="p-6">
            <button
              onClick={() => setShowEncLogs(!showEncLogs)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-warning/20 bg-warning/10">
                  <Lock className="h-5 w-5 text-warning" />
                </div>
                <div className="text-left">
                  <h3 className="font-heading text-lg font-bold text-foreground">Encryption Logs</h3>
                  <p className="text-sm text-muted-foreground">Paillier homomorphic encryption · {encLogs.length} events</p>
                </div>
              </div>
              {showEncLogs ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </button>

            {showEncLogs && (
              <div className="mt-4 rounded-xl border border-border bg-background/80 overflow-hidden">
                <div className="divide-y divide-border">
                  {encLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 font-mono text-xs">
                      <span className="shrink-0 text-muted-foreground">{log.timestamp}</span>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${log.status === 'ok' ? 'border-success/30 text-success' : 'border-primary/30 text-primary'}`}>
                        {log.action}
                      </Badge>
                      <span className="text-foreground/80">{log.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aggregation Report */}
      {aggResult && (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className={`h-0.5 bg-gradient-to-r ${aggResult.trustScore >= 70 ? 'from-success via-teal to-primary' : 'from-destructive to-warning'}`} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${aggResult.trustScore >= 70 ? 'border-success/20 bg-success/10' : 'border-destructive/20 bg-destructive/10'}`}>
                  <ShieldCheck className={`h-5 w-5 ${aggResult.trustScore >= 70 ? 'text-success' : 'text-destructive'}`} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">Robust Aggregation Report</h3>
                  <p className="text-sm text-muted-foreground">Byzantine-resilient validation checks</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trust Score</p>
                <p className={`font-heading text-3xl font-bold ${aggResult.trustScore >= 70 ? 'text-success' : 'text-destructive'}`}>{aggResult.trustScore}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {aggResult.checks.map(c => (
                <div key={c.label} className={`flex items-center gap-3 rounded-xl border p-4 ${c.pass ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
                  {c.pass ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{c.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{c.threshold}</span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${c.pass ? 'text-success' : 'text-destructive'}`}>{c.value}</span>
                  </div>
                  <Badge className={`shrink-0 font-mono text-[10px] border ${c.pass ? 'border-success/20 bg-success/10 text-success' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}>
                    {c.pass ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && errorMsg && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
