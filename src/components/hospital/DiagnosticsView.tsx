import { useData } from '@/context/DataProvider';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar, LabelList
} from 'recharts';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Activity } from 'lucide-react';

const PIE_COLORS = ['hsl(170, 50%, 50%)', 'hsl(185, 60%, 50%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-elevated">
      <p className="font-heading text-sm font-semibold text-foreground">{payload[0].name}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        Value: <span className="text-primary font-semibold">{(payload[0].value * 100).toFixed(1)}%</span>
      </p>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-elevated">
      <p className="font-heading text-sm font-semibold text-foreground">{payload[0].payload.name}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        Score: <span className="text-primary font-semibold">{payload[0].value}%</span>
      </p>
    </div>
  );
};

export default function DiagnosticsView() {
  const { updateRequests } = useData();
  const latestRequest = updateRequests[0];

  if (!latestRequest) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <Activity className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-xl font-heading font-semibold text-foreground">No diagnostics available</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">Submit a model update from your hospital agent to see comprehensive diagnostics here.</p>
        </div>
      </div>
    );
  }

  const diagnostics = latestRequest.diagnostics as Record<string, any> | null;
  const labelDist = latestRequest.label_distribution as Record<string, number> | null;
  const trustScore = latestRequest.trust_score ?? 0;

  const labelData = labelDist
    ? Object.entries(labelDist).map(([name, value]) => ({ name, value }))
    : [{ name: 'Survived', value: 0.75 }, { name: 'Mortality', value: 0.25 }];

  const checkItems = [
    { label: 'L2 Norm', threshold: '≤ 1.0', pass: latestRequest.l2_norm != null ? latestRequest.l2_norm <= 1.0 : null, value: latestRequest.l2_norm?.toFixed(4), icon: latestRequest.l2_norm != null && latestRequest.l2_norm <= 1.0 ? CheckCircle2 : XCircle },
    { label: 'Key Fingerprint', threshold: 'Match', pass: latestRequest.key_fingerprint_match, value: latestRequest.key_fingerprint_match ? 'Verified' : 'Mismatch', icon: latestRequest.key_fingerprint_match ? CheckCircle2 : XCircle },
    { label: 'Clinical Outliers', threshold: '≤ 10%', pass: latestRequest.clinical_outlier_pct != null ? latestRequest.clinical_outlier_pct <= 0.1 : null, value: latestRequest.clinical_outlier_pct != null ? `${(latestRequest.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A', icon: latestRequest.clinical_outlier_pct != null && latestRequest.clinical_outlier_pct <= 0.1 ? CheckCircle2 : XCircle },
    { label: 'Trust Score', threshold: '≥ 70', pass: trustScore >= 70, value: trustScore.toString(), icon: trustScore >= 70 ? CheckCircle2 : XCircle },
  ];

  const barData = diagnostics?.feature_checks
    ? Object.entries(diagnostics.feature_checks).map(([name, value]) => ({ name, value: value as number }))
    : [
      { name: 'Heart Rate', value: 92 }, { name: 'Blood Pressure', value: 88 },
      { name: 'SpO2', value: 95 }, { name: 'GCS', value: 90 },
      { name: 'Lab Values', value: 85 }, { name: 'Temperature', value: 93 },
    ];

  const passCount = checkItems.filter(c => c.pass === true).length;
  const statusColor = trustScore >= 70 ? 'success' : trustScore >= 40 ? 'warning' : 'destructive';
  const statusLabel = trustScore >= 70 ? 'CLEAN' : trustScore >= 40 ? 'WARNING' : 'REJECTED';
  const StatusIcon = trustScore >= 70 ? ShieldCheck : ShieldAlert;

  const gaugeData = [{ value: trustScore, fill: trustScore >= 70 ? 'hsl(152, 69%, 46%)' : trustScore >= 40 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)' }];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-2xl border border-${statusColor}/20 bg-card shadow-card overflow-hidden`}>
        <div className={`h-1 bg-gradient-to-r ${trustScore >= 70 ? 'from-success via-teal to-primary' : trustScore >= 40 ? 'from-warning to-warning/30' : 'from-destructive to-warning'}`} />
        <div className="flex items-center gap-6 p-6">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-${statusColor}/20 bg-${statusColor}/10`}>
            <StatusIcon className={`h-8 w-8 text-${statusColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-heading text-xl font-bold text-foreground">Aggregation Result: {statusLabel}</h3>
              <Badge className={`border border-${statusColor}/20 bg-${statusColor}/10 text-${statusColor} font-mono text-[10px]`}>
                {passCount}/{checkItems.length} PASSED
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {trustScore >= 70 ? 'All checks passed. This update is safe to aggregate into the global model.'
                : trustScore >= 40 ? 'Some checks raised warnings. Manual review recommended before aggregation.'
                : 'Critical checks failed. This update should be rejected to protect model integrity.'}
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Trust Score</p>
            <p className={`font-heading text-4xl font-bold text-${statusColor}`}>{trustScore}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Trust Gauge */}
        <div className="rounded-2xl border border-border bg-card shadow-card lg:col-span-4">
          <div className="p-6 pb-2">
            <h3 className="font-heading text-base font-bold text-foreground">Trust Score Gauge</h3>
          </div>
          <div className="flex flex-col items-center px-6 pb-6">
            <div className="relative">
              <ResponsiveContainer width={220} height={220}>
                <RadialBarChart cx="50%" cy="50%" innerRadius={75} outerRadius={100} barSize={16} data={gaugeData} startAngle={225} endAngle={-45}>
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(210, 15%, 14%)' }} animationDuration={1500} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-heading text-4xl font-bold text-${statusColor}`}>{trustScore}</span>
                <span className="text-xs text-muted-foreground font-medium">/ 100</span>
              </div>
            </div>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full border border-${statusColor}/20 bg-${statusColor}/10 px-5 py-2 text-sm font-bold text-${statusColor}`}>
              <StatusIcon className="h-4 w-4" />
              {statusLabel}
            </div>
          </div>
        </div>

        {/* Aggregation Checks */}
        <div className="rounded-2xl border border-border bg-card shadow-card lg:col-span-4">
          <div className="p-6 pb-4">
            <h3 className="font-heading text-base font-bold text-foreground">Aggregation Checks</h3>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {checkItems.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                  c.pass === true ? 'border-success/20 bg-success/5' :
                  c.pass === false ? 'border-destructive/20 bg-destructive/5' :
                  'border-border bg-secondary/30'
                }`}>
                  <Icon className={`h-5 w-5 shrink-0 ${c.pass === true ? 'text-success' : c.pass === false ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{c.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{c.threshold}</span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${c.pass === true ? 'text-success' : c.pass === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {c.value ?? 'N/A'}
                    </span>
                  </div>
                  <Badge className={`shrink-0 font-mono text-[10px] border ${
                    c.pass === true ? 'border-success/20 bg-success/10 text-success' :
                    c.pass === false ? 'border-destructive/20 bg-destructive/10 text-destructive' :
                    'border-border bg-muted text-muted-foreground'
                  }`}>
                    {c.pass === true ? 'PASS' : c.pass === false ? 'FAIL' : 'N/A'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Label Distribution */}
        <div className="rounded-2xl border border-border bg-card shadow-card lg:col-span-4">
          <div className="p-6 pb-2">
            <h3 className="font-heading text-base font-bold text-foreground">Label Distribution</h3>
          </div>
          <div className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={labelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" strokeWidth={3} stroke="hsl(210, 18%, 11%)" animationDuration={1200}>
                  {labelData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 13, fontFamily: 'var(--font-display)', color: 'hsl(210, 10%, 90%)' }} iconType="circle" iconSize={8} />
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {labelData.map((item, i) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="font-mono text-muted-foreground">{(item.value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value * 100}%`, backgroundColor: PIE_COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Feature Validation */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-cyan to-teal" />
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">Clinical Feature Validation</h3>
              <p className="text-sm text-muted-foreground">Percentage of values within expected clinical ranges</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-8">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(210, 10%, 90%)', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(210, 10%, 45%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(210, 15%, 14%)', radius: 8 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1200}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.value >= 90 ? 'hsl(152, 69%, 46%)' : entry.value >= 80 ? 'hsl(170, 50%, 50%)' : entry.value >= 70 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)'} />
                ))}
                <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: 'hsl(210, 10%, 45%)', fontFamily: 'var(--font-mono)', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
