import { useData } from '@/context/DataProvider';
import { Activity, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function HospitalOverview() {
  const { modelVersions, updateRequests, selectedModelVersion } = useData();

  const activeModel = modelVersions.find(m => m.version_number.toString() === selectedModelVersion);
  const myRequests = updateRequests;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  const stats = [
    { label: 'Active Model', value: activeModel ? `v${activeModel.version_number}` : 'None', icon: TrendingUp, accent: 'primary' },
    { label: 'Model Accuracy', value: activeModel?.accuracy ? `${(activeModel.accuracy * 100).toFixed(1)}%` : 'N/A', icon: Activity, accent: 'teal' },
    { label: 'Approved Updates', value: approvedCount.toString(), icon: CheckCircle, accent: 'success' },
    { label: 'Pending Updates', value: pendingCount.toString(), icon: Clock, accent: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card card-hover">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg border border-${s.accent}/20 bg-${s.accent}/10 transition-transform group-hover:scale-110`}>
                <s.icon className={`h-4 w-4 text-${s.accent}`} />
              </div>
            </div>
            <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/[0.03] opacity-0 transition-opacity group-hover:opacity-100 blur-xl" />
          </div>
        ))}
      </div>

      {activeModel && (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-primary via-primary-glow to-teal" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold text-foreground">Current Model — v{activeModel.version_number}</h3>
              <span className="flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Active
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Architecture', value: activeModel.architecture, mono: true },
                { label: 'AUC', value: activeModel.auc ? `${(activeModel.auc * 100).toFixed(1)}%` : 'N/A' },
                { label: 'F1 Score', value: activeModel.f1_score ? activeModel.f1_score.toFixed(3) : 'N/A' },
                { label: 'Precision', value: activeModel.precision_score ? activeModel.precision_score.toFixed(3) : 'N/A' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-border bg-secondary/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className={`mt-1 text-lg font-semibold text-foreground ${item.mono ? 'font-mono text-sm' : ''}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
