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
    { label: 'Model Versions', value: totalModels.toString(), icon: Activity, color: 'text-primary' },
    { label: 'Active Model', value: activeModel ? `v${activeModel.version_number}` : 'None', icon: CheckCircle, color: 'text-success' },
    { label: 'Pending Updates', value: pendingUpdates.toString(), icon: Users, color: 'text-warning' },
    { label: 'Rejected Updates', value: rejectedUpdates.toString(), icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
