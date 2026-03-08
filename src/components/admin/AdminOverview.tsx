import { useData } from '@/context/DataProvider';
import { Activity, Users, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminOverview() {
  const { modelVersions, updateRequests } = useData();

  const totalModels = modelVersions.length;
  const activeModel = modelVersions.find(m => m.status === 'active');
  const pendingUpdates = updateRequests.filter(r => r.status === 'pending').length;
  const rejectedUpdates = updateRequests.filter(r => r.status === 'rejected').length;

  const stats = [
    { label: 'Model Versions', value: totalModels.toString(), icon: Activity, accent: 'primary' },
    { label: 'Active Model', value: activeModel ? `v${activeModel.version_number}` : 'None', icon: CheckCircle, accent: 'success' },
    { label: 'Pending Updates', value: pendingUpdates.toString(), icon: Users, accent: 'warning' },
    { label: 'Rejected Updates', value: rejectedUpdates.toString(), icon: AlertTriangle, accent: 'destructive' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card card-hover">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border border-${s.accent}/20 bg-${s.accent}/10 transition-transform group-hover:scale-110`}>
              <s.icon className={`h-4 w-4 text-${s.accent}`} />
            </div>
          </div>
          <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
          {/* Subtle glow on hover */}
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/[0.03] opacity-0 transition-opacity group-hover:opacity-100 blur-xl" />
        </div>
      ))}
    </div>
  );
}
