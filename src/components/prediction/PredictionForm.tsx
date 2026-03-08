import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/context/DataProvider';
import { Loader2, AlertTriangle, CheckCircle, ClipboardPaste } from 'lucide-react';
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
        description: 'Could not reach the backend. Make sure the FastAPI server is running on port 8000.',
        variant: 'destructive',
      });
      // Fallback: generate a simulated result for UI demonstration
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
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>ICU Mortality Prediction</CardTitle>
          <CardDescription>
            Enter patient vitals and lab values to predict mortality risk using model v{selectedModelVersion}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  step="any"
                  min={f.min}
                  max={f.max}
                  value={values[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            ))}
          </div>
          <Button onClick={handlePredict} className="mt-6" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Prediction
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.mortality_probability > 0.5 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
              Prediction Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">Mortality Probability</p>
                <p className="mt-2 text-4xl font-bold text-foreground">
                  {(result.mortality_probability * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">Risk Category</p>
                <p className={`mt-2 text-2xl font-bold ${
                  result.risk_category === 'High Risk' ? 'text-destructive' :
                  result.risk_category === 'Moderate Risk' ? 'text-warning' : 'text-success'
                }`}>
                  {result.risk_category}
                </p>
              </div>
              <div className="rounded-xl border border-border p-6">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Top Feature Contributions</p>
                <div className="space-y-2">
                  {Object.entries(result.feature_contributions)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 5)
                    .map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{name}</span>
                        <span className={`font-mono font-medium ${value > 0 ? 'text-destructive' : 'text-success'}`}>
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

// Simple simulation for UI preview when backend is unavailable
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
