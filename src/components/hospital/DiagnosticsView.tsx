import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['hsl(199, 89%, 48%)', 'hsl(168, 76%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

const TrustGauge = ({ score }: { score: number }) => {
  const color = score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-destructive';
  const bgColor = score >= 70 ? 'bg-success/10' : score >= 40 ? 'bg-warning/10' : 'bg-destructive/10';
  return (
    <div className={`flex flex-col items-center rounded-xl ${bgColor} p-6`}>
      <p className={`text-4xl font-bold ${color}`}>{score}</p>
      <p className="text-sm text-muted-foreground">Trust Score</p>
      <p className={`mt-1 text-xs font-medium ${color}`}>
        {score >= 70 ? 'CLEAN' : score >= 40 ? 'WARNING' : 'REJECTED'}
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
        <CardContent className="py-12 text-center text-muted-foreground">
          No diagnostics available. Submit an update to see diagnostics.
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
            <CardTitle className="text-base">Trust Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <TrustGauge score={latestRequest.trust_score ?? 0} />
          </CardContent>
        </Card>

        {/* Label Distribution Pie */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Label Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={labelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                  {labelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Checks */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Aggregation Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checkItems.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.value ?? 'N/A'}</p>
                </div>
                <Badge variant={c.pass === true ? 'default' : c.pass === false ? 'destructive' : 'secondary'}>
                  {c.pass === true ? 'PASS' : c.pass === false ? 'FAIL' : 'N/A'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Feature Check Bar Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Clinical Feature Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
