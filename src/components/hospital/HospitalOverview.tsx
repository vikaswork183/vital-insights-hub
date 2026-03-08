import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';

export default function HospitalOverview() {
  const { modelVersions, updateRequests, selectedModelVersion } = useData();

  const activeModel = modelVersions.find(m => m.version_number.toString() === selectedModelVersion);
  const myRequests = updateRequests;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  const stats = [
    { label: 'Active Model', value: activeModel ? `v${activeModel.version_number}` : 'None', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/8' },
    { label: 'Model Accuracy', value: activeModel?.accuracy ? `${(activeModel.accuracy * 100).toFixed(1)}%` : 'N/A', icon: Activity, color: 'text-accent', bg: 'bg-accent/8' },
    { label: 'Approved Updates', value: approvedCount.toString(), icon: CheckCircle, color: 'text-success', bg: 'bg-success/8' },
    { label: 'Pending Updates', value: pendingCount.toString(), icon: Clock, color: 'text-warning', bg: 'bg-warning/8' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="group relative overflow-hidden shadow-card card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>
                <s.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
            </CardContent>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary/3 to-accent/3 opacity-0 transition-opacity group-hover:opacity-100" />
          </Card>
        ))}
      </div>

      {activeModel && (
        <Card className="shadow-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary-glow to-accent" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Current Model — v{activeModel.version_number}</CardTitle>
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Active
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              {[
                { label: 'Architecture', value: activeModel.architecture, mono: true },
                { label: 'AUC', value: activeModel.auc ? `${(activeModel.auc * 100).toFixed(1)}%` : 'N/A' },
                { label: 'F1 Score', value: activeModel.f1_score ? activeModel.f1_score.toFixed(3) : 'N/A' },
                { label: 'Precision', value: activeModel.precision_score ? activeModel.precision_score.toFixed(3) : 'N/A' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className={`mt-1 text-lg font-semibold text-foreground ${item.mono ? 'font-mono text-sm' : ''}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
