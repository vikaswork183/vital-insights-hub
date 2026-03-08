import { useData } from '@/context/DataProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Brain, TrendingUp } from 'lucide-react';

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
  if (ratio > 0.8) return 'hsl(0, 80%, 50%)';
  if (ratio > 0.6) return 'hsl(15, 85%, 52%)';
  if (ratio > 0.4) return 'hsl(28, 90%, 55%)';
  if (ratio > 0.2) return 'hsl(38, 92%, 50%)';
  return 'hsl(45, 80%, 40%)';
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-elevated">
      <p className="font-heading text-sm font-semibold text-foreground">{data.feature}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        Importance: <span className="text-primary font-semibold">{data.importance.toFixed(4)}</span>
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        Rank: <span className="text-foreground font-semibold">#{data.rank}</span>
      </p>
    </div>
  );
};

export default function FeatureImportance() {
  const { modelVersions, selectedModelVersion } = useData();

  const activeModel = modelVersions.find(m => m.version_number.toString() === selectedModelVersion);
  const importance = activeModel?.feature_importance as Array<{ feature: string; importance: number }> | null;

  const sortedData = (importance && importance.length > 0 ? importance : DEFAULT_IMPORTANCE)
    .sort((a, b) => b.importance - a.importance)
    .map((item, index) => ({ ...item, rank: index + 1, pct: 0 }));

  const maxImportance = sortedData[0]?.importance ?? 1;
  const totalImportance = sortedData.reduce((sum, d) => sum + d.importance, 0);
  sortedData.forEach(d => { d.pct = (d.importance / totalImportance) * 100; });

  const top3 = sortedData.slice(0, 3);
  const top3Colors = ['primary', 'cyan', 'teal'] as const;

  return (
    <div className="space-y-6">
      {/* Top features highlight */}
      <div className="grid gap-4 md:grid-cols-3">
        {top3.map((item, i) => (
          <div key={item.feature} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card card-hover">
            <div className={`h-0.5 absolute top-0 left-0 right-0 bg-gradient-to-r ${i === 0 ? 'from-primary to-primary-glow' : i === 1 ? 'from-cyan to-teal' : 'from-teal to-success'}`} />
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg border border-${top3Colors[i]}/20 bg-${top3Colors[i]}/10 font-heading text-xs font-bold text-${top3Colors[i]}`}>
                    #{i + 1}
                  </span>
                  <span className="font-heading text-lg font-bold text-foreground">{item.feature}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-bold text-foreground">{item.pct.toFixed(1)}%</span>
                  <span className="font-mono text-xs text-muted-foreground">raw: {item.importance.toFixed(4)}</span>
                </div>
              </div>
              <TrendingUp className={`h-5 w-5 text-${top3Colors[i]}`} />
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-cyan' : 'bg-teal'}`}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Full chart */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-cyan to-teal" />
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Feature Importance</h3>
                <p className="text-sm text-muted-foreground">Model v{selectedModelVersion} — Relative contribution to mortality prediction</p>
              </div>
            </div>
            <span className="rounded-full border border-border bg-secondary px-3 py-1 font-mono text-xs text-muted-foreground">{sortedData.length} features</span>
          </div>
        </div>
        <div className="px-6 pb-8">
          <ResponsiveContainer width="100%" height={620}>
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ left: 10, right: 60, top: 10, bottom: 10 }}
              barCategoryGap="18%"
            >
              <XAxis
                type="number"
                domain={[0, 'auto']}
                tick={{ fontSize: 11, fill: 'hsl(210, 10%, 45%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <YAxis
                type="category"
                dataKey="feature"
                tick={{ fontSize: 13, fill: 'hsl(210, 10%, 90%)', fontWeight: 500 }}
                width={120}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(210, 15%, 14%)', radius: 8 }} />
              <Bar dataKey="importance" radius={[0, 8, 8, 0]} animationDuration={1200} animationBegin={100}>
                {sortedData.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.importance, maxImportance)} />
                ))}
                <LabelList
                  dataKey="pct"
                  position="right"
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  style={{ fontSize: 11, fill: 'hsl(210, 10%, 45%)', fontFamily: 'var(--font-mono)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
