import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminOverview() {
  const { modelVersions, updateRequests } = useData();

  const totalModels = modelVersions.length;
  const activeModel = modelVersions.find(m => m.status === 'active');
  const pendingUpdates = updateRequests.filter(r => r.status === 'pending').length;
  const rejectedUpdates = updateRequests.filter(r => r.status === 'rejected').length;

  const stats = [
    { label: 'Model Versions', value: totalModels.toString(), icon: Activity, color: 'text-primary', bg: 'bg-primary/8' },
    { label: 'Active Model', value: activeModel ? `v${activeModel.version_number}` : 'None', icon: CheckCircle, color: 'text-success', bg: 'bg-success/8' },
    { label: 'Pending Updates', value: pendingUpdates.toString(), icon: Users, color: 'text-warning', bg: 'bg-warning/8' },
    { label: 'Rejected Updates', value: rejectedUpdates.toString(), icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/8' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="group relative overflow-hidden shadow-card card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>
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
  );
}
