import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['hsl(210, 100%, 52%)', 'hsl(162, 72%, 46%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const TrustGauge = ({ score }: { score: number }) => {
  const color = score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-destructive';
  const bgColor = score >= 70 ? 'bg-success/8' : score >= 40 ? 'bg-warning/8' : 'bg-destructive/8';
  const ringColor = score >= 70 ? 'ring-success/20' : score >= 40 ? 'ring-warning/20' : 'ring-destructive/20';
  const label = score >= 70 ? 'CLEAN' : score >= 40 ? 'WARNING' : 'REJECTED';

  return (
    <div className={`flex flex-col items-center rounded-2xl ${bgColor} ring-2 ${ringColor} p-8`}>
      <div className="relative">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
          <circle
            cx="50" cy="50" r="42" fill="none" strokeWidth="6"
            strokeDasharray={`${(score / 100) * 264} 264`}
            strokeLinecap="round"
            className={color}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-heading text-3xl font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">Trust Score</p>
      <span className={`mt-1 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bgColor} ${color}`}>
        {label}
      </span>
    </div>
  );
};

export default function DiagnosticsView() {
  const { updateRequests } = useData();

  const latestRequest = updateRequests[0];

  if (!latestRequest) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <p className="text-lg font-medium text-foreground">No diagnostics available</p>
          <p className="mt-1 text-sm text-muted-foreground">Submit an update to see diagnostics here.</p>
        </CardContent>
      </Card>
    );
  }

  const diagnostics = latestRequest.diagnostics as Record<string, any> | null;
  const labelDist = latestRequest.label_distribution as Record<string, number> | null;

  const labelData = labelDist ? Object.entries(labelDist).map(([name, value]) => ({ name, value })) : [
    { name: 'Survived', value: 0.75 },
    { name: 'Mortality', value: 0.25 },
  ];

  const checkItems = [
    { label: 'L2 Norm ≤ 1.0', pass: latestRequest.l2_norm != null ? latestRequest.l2_norm <= 1.0 : null, value: latestRequest.l2_norm?.toFixed(4) },
    { label: 'Key Fingerprint Match', pass: latestRequest.key_fingerprint_match, value: latestRequest.key_fingerprint_match ? 'Yes' : 'No' },
    { label: 'Outlier % ≤ 10%', pass: latestRequest.clinical_outlier_pct != null ? latestRequest.clinical_outlier_pct <= 0.1 : null, value: latestRequest.clinical_outlier_pct != null ? `${(latestRequest.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A' },
    { label: 'Trust Score ≥ 70', pass: latestRequest.trust_score != null ? latestRequest.trust_score >= 70 : null, value: latestRequest.trust_score?.toString() },
  ];

  const barData = diagnostics?.feature_checks
    ? Object.entries(diagnostics.feature_checks).map(([name, value]) => ({ name, value: value as number }))
    : [
      { name: 'HR Range', value: 92 }, { name: 'BP Range', value: 88 },
      { name: 'SpO2 Range', value: 95 }, { name: 'GCS Range', value: 90 },
      { name: 'Lab Values', value: 85 }, { name: 'Temp Range', value: 93 },
    ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trust Score */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Trust Assessment</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <TrustGauge score={latestRequest.trust_score ?? 0} />
          </CardContent>
        </Card>

        {/* Label Distribution Pie */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Label Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={labelData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label strokeWidth={2} stroke="hsl(var(--card))">
                  {labelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-elevated)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Checks */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Aggregation Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {checkItems.map((c) => (
              <div key={c.label} className={`flex items-center justify-between rounded-xl border p-3.5 transition-colors ${
                c.pass === true ? 'border-success/20 bg-success/5' :
                c.pass === false ? 'border-destructive/20 bg-destructive/5' :
                'border-border bg-muted/30'
              }`}>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.value ?? 'N/A'}</p>
                </div>
                <Badge variant={c.pass === true ? 'default' : c.pass === false ? 'destructive' : 'secondary'} className="font-mono text-[10px]">
                  {c.pass === true ? 'PASS' : c.pass === false ? 'FAIL' : 'N/A'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Feature Check Bar Chart */}
      <Card className="shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-teal" />
        <CardHeader>
          <CardTitle className="font-heading text-base">Clinical Feature Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-elevated)', background: 'hsl(var(--card))' }}
              />
              <Bar dataKey="value" fill="hsl(210, 100%, 52%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
