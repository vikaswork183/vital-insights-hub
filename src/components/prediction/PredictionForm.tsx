import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/context/DataProvider';
import { Loader2, AlertTriangle, CheckCircle, ClipboardPaste, RotateCcw, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FEATURES = [
  { key: 'age', label: 'Age (years)', min: 0, max: 120, defaultVal: 65 },
  { key: 'gender', label: 'Gender (0=F, 1=M)', min: 0, max: 1, defaultVal: 1 },
  { key: 'heart_rate', label: 'Heart Rate (bpm)', min: 20, max: 250, defaultVal: 82 },
  { key: 'systolic_bp', label: 'Systolic BP (mmHg)', min: 40, max: 300, defaultVal: 120 },
  { key: 'diastolic_bp', label: 'Diastolic BP (mmHg)', min: 20, max: 200, defaultVal: 70 },
  { key: 'map', label: 'MAP (mmHg)', min: 20, max: 200, defaultVal: 85 },
  { key: 'respiratory_rate', label: 'Respiratory Rate (/min)', min: 4, max: 60, defaultVal: 18 },
  { key: 'spo2', label: 'SpO2 (%)', min: 50, max: 100, defaultVal: 97 },
  { key: 'temperature', label: 'Temperature (°C)', min: 30, max: 43, defaultVal: 37.0 },
  { key: 'gcs_total', label: 'GCS Total (3–15)', min: 3, max: 15, defaultVal: 14 },
  { key: 'creatinine', label: 'Creatinine (mg/dL)', min: 0, max: 30, defaultVal: 1.1 },
  { key: 'bun', label: 'BUN (mg/dL)', min: 0, max: 200, defaultVal: 22 },
  { key: 'glucose', label: 'Glucose (mg/dL)', min: 10, max: 1000, defaultVal: 120 },
  { key: 'wbc', label: 'WBC (×10³/µL)', min: 0, max: 100, defaultVal: 10.0 },
  { key: 'hemoglobin', label: 'Hemoglobin (g/dL)', min: 1, max: 25, defaultVal: 12.0 },
  { key: 'platelets', label: 'Platelets (×10³/µL)', min: 0, max: 1000, defaultVal: 200 },
  { key: 'lactate', label: 'Lactate (mmol/L)', min: 0, max: 30, defaultVal: 1.5 },
  { key: 'shock_index', label: 'Shock Index', min: 0, max: 5, defaultVal: 0.7 },
  { key: 'bun_cr_ratio', label: 'BUN/Cr Ratio', min: 0, max: 100, defaultVal: 18 },
  { key: 'map_deviation', label: 'MAP Deviation', min: -50, max: 50, defaultVal: 0 },
];

interface PredictionResult {
  mortality_probability: number;
  risk_category: string;
  feature_contributions: Record<string, number>;
}

export default function PredictionForm() {
  const { selectedModelVersion } = useData();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(FEATURES.map(f => [f.key, f.defaultVal]))
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [bulkInput, setBulkInput] = useState('');

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const handleReset = () => {
    setValues(Object.fromEntries(FEATURES.map(f => [f.key, f.defaultVal])));
    setResult(null);
    setBulkInput('');
  };

  const handleBulkFill = () => {
    const parts = bulkInput.split(',').map(s => s.trim());
    if (parts.length !== FEATURES.length) {
      toast({
        title: 'Invalid input',
        description: `Expected ${FEATURES.length} comma-separated values, got ${parts.length}.`,
        variant: 'destructive',
      });
      return;
    }
    const newValues: Record<string, number> = {};
    for (let i = 0; i < FEATURES.length; i++) {
      const num = parseFloat(parts[i]);
      if (isNaN(num)) {
        toast({
          title: 'Invalid value',
          description: `"${parts[i]}" at position ${i + 1} (${FEATURES[i].label}) is not a valid number.`,
          variant: 'destructive',
        });
        return;
      }
      newValues[FEATURES[i].key] = num;
    }
    setValues(newValues);
    toast({ title: 'Fields filled', description: 'All 20 feature fields have been populated.' });
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: values, model_version: selectedModelVersion }),
      });

      if (!response.ok) throw new Error('Prediction failed');
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      toast({
        title: 'Prediction Error',
        description: 'Could not reach the backend. Using simulated prediction for demo.',
        variant: 'destructive',
      });
      const simProb = simulatePrediction(values);
      setResult({
        mortality_probability: simProb,
        risk_category: simProb > 0.7 ? 'High Risk' : simProb > 0.3 ? 'Moderate Risk' : 'Low Risk',
        feature_contributions: Object.fromEntries(
          FEATURES.slice(0, 10).map(f => [f.label, Math.random() * 0.2 - 0.1])
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-teal" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                ICU Mortality Prediction
              </CardTitle>
              <CardDescription className="mt-1">
                Enter patient vitals and lab values to predict mortality risk using model v{selectedModelVersion}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bulk fill section */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Quick Fill</Label>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Paste {FEATURES.length} comma-separated values in order: {FEATURES.map(f => f.label.split(' (')[0]).join(', ')}
            </p>
            <div className="flex gap-2">
              <Textarea
                placeholder="e.g. 65, 1, 82, 120, 70, 85, 18, 97, 37.0, 14, 1.1, 22, 120, 10.0, 12.0, 200, 1.5, 0.7, 18, 0"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="font-mono text-sm min-h-[56px] resize-none"
              />
              <Button variant="secondary" onClick={handleBulkFill} className="shrink-0 gap-1.5 h-auto">
                <ClipboardPaste className="h-4 w-4" /> Fill
              </Button>
            </div>
          </div>

          {/* Individual fields */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-[11px] font-medium text-muted-foreground">{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  step="any"
                  min={f.min}
                  max={f.max}
                  value={values[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="font-mono text-sm h-10"
                />
              </div>
            ))}
          </div>

          <Button onClick={handlePredict} disabled={loading} className="gap-2 bg-gradient-to-r from-primary to-primary-glow shadow-glow-sm hover:shadow-glow transition-shadow">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Run Prediction
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="shadow-card overflow-hidden animate-scale-in">
          <div className={`h-1 ${result.mortality_probability > 0.5 ? 'bg-gradient-to-r from-destructive to-warning' : 'bg-gradient-to-r from-success to-accent'}`} />
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              {result.mortality_probability > 0.5 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
              Prediction Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-7 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mortality Probability</p>
                <p className="mt-3 font-heading text-5xl font-bold text-foreground">
                  {(result.mortality_probability * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-7 text-center flex flex-col items-center justify-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Category</p>
                <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2 text-lg font-bold ${
                  result.risk_category === 'High Risk' ? 'bg-destructive/10 text-destructive' :
                  result.risk_category === 'Moderate Risk' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                }`}>
                  {result.risk_category === 'High Risk' ? <AlertTriangle className="h-4 w-4" /> :
                   result.risk_category === 'Moderate Risk' ? <AlertTriangle className="h-4 w-4" /> :
                   <CheckCircle className="h-4 w-4" />}
                  {result.risk_category}
                </div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-7">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Feature Contributions</p>
                <div className="space-y-2.5">
                  {Object.entries(result.feature_contributions)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 5)
                    .map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate mr-2">{name}</span>
                        <span className={`font-mono text-xs font-semibold ${value > 0 ? 'text-destructive' : 'text-success'}`}>
                          {value > 0 ? '+' : ''}{value.toFixed(3)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function simulatePrediction(values: Record<string, number>): number {
  let risk = 0.15;
  if (values.age > 70) risk += 0.15;
  if (values.gcs_total < 8) risk += 0.25;
  if (values.lactate > 4) risk += 0.2;
  if (values.spo2 < 90) risk += 0.15;
  if (values.map < 65) risk += 0.15;
  if (values.heart_rate > 120) risk += 0.1;
  if (values.creatinine > 3) risk += 0.1;
  return Math.min(0.95, Math.max(0.05, risk + (Math.random() * 0.1 - 0.05)));
}
