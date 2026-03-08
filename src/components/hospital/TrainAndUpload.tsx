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

// Simulate training metrics based on dataset characteristics
function simulateTraining(rowCount: number, colCount: number): TrainingMetrics {
  const base = Math.min(0.92, 0.7 + (rowCount / 10000) * 0.15 + (colCount / 50) * 0.05);
  const noise = () => (Math.random() - 0.5) * 0.04;
  return {
    accuracy: Math.min(0.99, base + noise()),
    precision: Math.min(0.99, base - 0.02 + noise()),
    recall: Math.min(0.99, base - 0.01 + noise()),
    f1: Math.min(0.99, base - 0.015 + noise()),
    auc: Math.min(0.99, base + 0.03 + noise()),
    loss: Math.max(0.01, 0.5 - base * 0.4 + noise() * 0.1),
    epochs: 25,
    samples: rowCount,
    features: colCount - 1,
  };
}

// Simulate encryption logs
function simulateEncryption(): EncryptionLog[] {
  const now = new Date();
  const ts = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString().slice(11, 23);
  return [
    { timestamp: ts(0), action: 'KEY_GENERATION', detail: 'Generated Paillier keypair (2048-bit)', status: 'ok' },
    { timestamp: ts(120), action: 'DELTA_COMPUTATION', detail: 'Computed model delta (Δw) against global weights v3', status: 'info' },
    { timestamp: ts(340), action: 'ENCRYPT_WEIGHTS', detail: `Encrypted ${(Math.random() * 50 + 20).toFixed(0)} weight tensors using homomorphic encryption`, status: 'ok' },
    { timestamp: ts(580), action: 'FINGERPRINT', detail: `Key fingerprint: SHA256:${Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':')}`, status: 'ok' },
    { timestamp: ts(650), action: 'INTEGRITY_HASH', detail: `HMAC-SHA256 digest computed for encrypted payload`, status: 'ok' },
    { timestamp: ts(720), action: 'SERIALIZE', detail: 'Serialized encrypted delta to protobuf format (2.3 MB)', status: 'info' },
    { timestamp: ts(800), action: 'UPLOAD_READY', detail: 'Encrypted payload ready for secure transmission', status: 'ok' },
  ];
}

// Simulate aggregation checks
function simulateAggregation(): { checks: AggregationCheck[]; trustScore: number; l2Norm: number; outlierPct: number } {
  const l2Norm = Math.random() * 0.8 + 0.1;
  const outlierPct = Math.random() * 0.08;
  const trustScore = Math.floor(70 + Math.random() * 25);
  return {
    l2Norm,
    outlierPct,
    trustScore,
    checks: [
      { label: 'L2 Norm Clipping', threshold: '≤ 1.0', value: l2Norm.toFixed(4), pass: l2Norm <= 1.0 },
      { label: 'Key Fingerprint', threshold: 'Match', value: 'Verified ✓', pass: true },
      { label: 'Clinical Outliers', threshold: '≤ 10%', value: `${(outlierPct * 100).toFixed(1)}%`, pass: outlierPct <= 0.1 },
      { label: 'Trust Score', threshold: '≥ 70', value: trustScore.toString(), pass: trustScore >= 70 },
      { label: 'Label Balance', threshold: 'Skew ≤ 0.3', value: (Math.random() * 0.2 + 0.05).toFixed(2), pass: true },
      { label: 'Gradient Norm', threshold: '< 5.0', value: (Math.random() * 3 + 0.5).toFixed(2), pass: true },
    ],
  };
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
