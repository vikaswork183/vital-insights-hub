import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

const getBarColor = (importance: number, max: number) => {
  const ratio = importance / max;
  if (ratio > 0.7) return 'hsl(210, 100%, 52%)';
  if (ratio > 0.4) return 'hsl(199, 100%, 52%)';
  if (ratio > 0.2) return 'hsl(162, 72%, 46%)';
  return 'hsl(var(--muted-foreground))';
};

export default function FeatureImportance() {
  const { modelVersions, selectedModelVersion } = useData();

  const activeModel = modelVersions.find(m => m.version_number.toString() === selectedModelVersion);
  const importance = activeModel?.feature_importance as Array<{ feature: string; importance: number }> | null;

  const data = (importance && importance.length > 0 ? importance : DEFAULT_IMPORTANCE)
    .sort((a, b) => b.importance - a.importance);

  const maxImportance = data[0]?.importance ?? 1;

  return (
    <Card className="shadow-card overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-primary via-primary-glow to-accent" />
      <CardHeader>
        <CardTitle className="font-heading">Feature Importance — Model v{selectedModelVersion}</CardTitle>
        <p className="text-sm text-muted-foreground">Relative contribution of each ICU feature to the mortality prediction</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={560}>
          <BarChart data={data} layout="vertical" margin={{ left: 120, right: 30, top: 10, bottom: 10 }}>
            <XAxis
              type="number"
              domain={[0, 'auto']}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="feature"
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              width={110}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number) => v.toFixed(4)}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid hsl(var(--border))',
                boxShadow: 'var(--shadow-elevated)',
                background: 'hsl(var(--card))',
                fontSize: 13,
              }}
            />
            <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.importance, maxImportance)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
