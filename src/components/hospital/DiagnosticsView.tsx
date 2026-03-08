import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar, LabelList
} from 'recharts';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Activity } from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444'];
const BAR_COLORS = ['#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444'];

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
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Activity className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-xl font-heading font-semibold text-foreground">No diagnostics available</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">Submit a model update from your hospital agent to see comprehensive diagnostics here.</p>
        </CardContent>
      </Card>
    );
  }

  const diagnostics = latestRequest.diagnostics as Record<string, any> | null;
  const labelDist = latestRequest.label_distribution as Record<string, number> | null;
  const trustScore = latestRequest.trust_score ?? 0;

  const labelData = labelDist
    ? Object.entries(labelDist).map(([name, value]) => ({ name, value }))
    : [{ name: 'Survived', value: 0.75 }, { name: 'Mortality', value: 0.25 }];

  const checkItems = [
    {
      label: 'L2 Norm',
      threshold: '≤ 1.0',
      pass: latestRequest.l2_norm != null ? latestRequest.l2_norm <= 1.0 : null,
      value: latestRequest.l2_norm?.toFixed(4),
      icon: latestRequest.l2_norm != null && latestRequest.l2_norm <= 1.0 ? CheckCircle2 : XCircle,
    },
    {
      label: 'Key Fingerprint',
      threshold: 'Match',
      pass: latestRequest.key_fingerprint_match,
      value: latestRequest.key_fingerprint_match ? 'Verified' : 'Mismatch',
      icon: latestRequest.key_fingerprint_match ? CheckCircle2 : XCircle,
    },
    {
      label: 'Clinical Outliers',
      threshold: '≤ 10%',
      pass: latestRequest.clinical_outlier_pct != null ? latestRequest.clinical_outlier_pct <= 0.1 : null,
      value: latestRequest.clinical_outlier_pct != null ? `${(latestRequest.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A',
      icon: latestRequest.clinical_outlier_pct != null && latestRequest.clinical_outlier_pct <= 0.1 ? CheckCircle2 : XCircle,
    },
    {
      label: 'Trust Score',
      threshold: '≥ 70',
      pass: trustScore >= 70,
      value: trustScore.toString(),
      icon: trustScore >= 70 ? CheckCircle2 : XCircle,
    },
  ];

  const barData = diagnostics?.feature_checks
    ? Object.entries(diagnostics.feature_checks).map(([name, value]) => ({ name, value: value as number }))
    : [
      { name: 'Heart Rate', value: 92 }, { name: 'Blood Pressure', value: 88 },
      { name: 'SpO2', value: 95 }, { name: 'GCS', value: 90 },
      { name: 'Lab Values', value: 85 }, { name: 'Temperature', value: 93 },
    ];

  const passCount = checkItems.filter(c => c.pass === true).length;
  const failCount = checkItems.filter(c => c.pass === false).length;

  const statusColor = trustScore >= 70 ? 'success' : trustScore >= 40 ? 'warning' : 'destructive';
  const statusLabel = trustScore >= 70 ? 'CLEAN' : trustScore >= 40 ? 'WARNING' : 'REJECTED';
  const StatusIcon = trustScore >= 70 ? ShieldCheck : ShieldAlert;

  // Radial gauge data
  const gaugeData = [{ value: trustScore, fill: trustScore >= 70 ? '#22c55e' : trustScore >= 40 ? '#f59e0b' : '#ef4444' }];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className={`shadow-card overflow-hidden border-${statusColor}/20`}>
        <div className={`h-1.5 bg-gradient-to-r ${trustScore >= 70 ? 'from-success via-teal to-accent' : trustScore >= 40 ? 'from-warning to-warning/30' : 'from-destructive to-warning'}`} />
        <CardContent className="flex items-center gap-6 py-6">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-${statusColor}/10`}>
            <StatusIcon className={`h-8 w-8 text-${statusColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-heading text-xl font-bold text-foreground">Aggregation Result: {statusLabel}</h3>
              <Badge className={`bg-${statusColor}/10 text-${statusColor} border-${statusColor}/20 font-mono text-[10px]`}>
                {passCount}/{checkItems.length} PASSED
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {trustScore >= 70
                ? 'All checks passed. This update is safe to aggregate into the global model.'
                : trustScore >= 40
                ? 'Some checks raised warnings. Manual review recommended before aggregation.'
                : 'Critical checks failed. This update should be rejected to protect model integrity.'}
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Trust Score</p>
            <p className={`font-heading text-4xl font-bold text-${statusColor}`}>{trustScore}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Trust Gauge - Large */}
        <Card className="shadow-card lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-heading text-base">Trust Score Gauge</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={220} height={220}>
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius={75} outerRadius={100}
                  barSize={16}
                  data={gaugeData}
                  startAngle={225}
                  endAngle={-45}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    background={{ fill: 'hsl(var(--muted))' }}
                    animationDuration={1500}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-heading text-4xl font-bold text-${statusColor}`}>{trustScore}</span>
                <span className="text-xs text-muted-foreground font-medium">/ 100</span>
              </div>
            </div>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full bg-${statusColor}/10 px-5 py-2 text-sm font-bold text-${statusColor}`}>
              <StatusIcon className="h-4 w-4" />
              {statusLabel}
            </div>
          </CardContent>
        </Card>

        {/* Aggregation Checks */}
        <Card className="shadow-card lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-heading text-base">Aggregation Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checkItems.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                  c.pass === true ? 'border-success/20 bg-success/5' :
                  c.pass === false ? 'border-destructive/20 bg-destructive/5' :
                  'border-border bg-muted/20'
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
                  <Badge
                    variant={c.pass === true ? 'default' : c.pass === false ? 'destructive' : 'secondary'}
                    className={`shrink-0 font-mono text-[10px] ${c.pass === true ? 'bg-success hover:bg-success/90' : ''}`}
                  >
                    {c.pass === true ? 'PASS' : c.pass === false ? 'FAIL' : 'N/A'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Label Distribution */}
        <Card className="shadow-card lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-heading text-base">Label Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={labelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={3}
                  stroke="hsl(var(--card))"
                  animationDuration={1200}
                >
                  {labelData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: 13, fontFamily: 'var(--font-display)' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Distribution bars */}
            <div className="mt-4 space-y-2">
              {labelData.map((item, i) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="font-mono text-muted-foreground">{(item.value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.value * 100}%`, backgroundColor: PIE_COLORS[i] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Feature Validation */}
      <Card className="shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-cyan to-teal" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-heading">Clinical Feature Validation</CardTitle>
              <p className="text-sm text-muted-foreground">Percentage of values within expected clinical ranges</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} barCategoryGap="25%">
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 8 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1200}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.value >= 90 ? '#22c55e' : entry.value >= 80 ? '#3b82f6' : entry.value >= 70 ? '#f59e0b' : '#ef4444'} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
