import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_IMPORTANCE = [
  { feature: 'Lactate', importance: 0.142 },
  { feature: 'GCS Total', importance: 0.128 },
  { feature: 'Age', importance: 0.115 },
  { feature: 'MAP', importance: 0.098 },
  { feature: 'SpO2', importance: 0.092 },
  { feature: 'Creatinine', importance: 0.087 },
  { feature: 'Heart Rate', importance: 0.075 },
  { feature: 'Shock Index', importance: 0.068 },
  { feature: 'BUN', importance: 0.055 },
  { feature: 'WBC', importance: 0.048 },
  { feature: 'Platelets', importance: 0.032 },
  { feature: 'Temperature', importance: 0.028 },
  { feature: 'Hemoglobin', importance: 0.025 },
  { feature: 'Glucose', importance: 0.022 },
  { feature: 'Respiratory Rate', importance: 0.018 },
  { feature: 'Systolic BP', importance: 0.015 },
  { feature: 'Diastolic BP', importance: 0.012 },
  { feature: 'MAP Deviation', importance: 0.01 },
  { feature: 'BUN/Cr Ratio', importance: 0.008 },
  { feature: 'Gender', importance: 0.005 },
];

export default function FeatureImportance() {
  const { modelVersions, selectedModelVersion } = useData();

  const activeModel = modelVersions.find(m => m.version_number.toString() === selectedModelVersion);
  const importance = activeModel?.feature_importance as Array<{ feature: string; importance: number }> | null;

  const data = (importance && importance.length > 0 ? importance : DEFAULT_IMPORTANCE)
    .sort((a, b) => b.importance - a.importance);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Feature Importance — Model v{selectedModelVersion}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20, top: 10, bottom: 10 }}>
            <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="feature" tick={{ fontSize: 12 }} width={110} />
            <Tooltip formatter={(v: number) => v.toFixed(4)} />
            <Bar dataKey="importance" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
