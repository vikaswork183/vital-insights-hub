import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function HospitalOverview() {
  const { modelVersions, updateRequests, selectedModelVersion } = useData();

  const activeModel = modelVersions.find(m => m.version_number.toString() === selectedModelVersion);
  const myRequests = updateRequests;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  const stats = [
    { label: 'Active Model', value: activeModel ? `v${activeModel.version_number}` : 'None', icon: TrendingUp, color: 'text-primary' },
    { label: 'Model Accuracy', value: activeModel?.accuracy ? `${(activeModel.accuracy * 100).toFixed(1)}%` : 'N/A', icon: Activity, color: 'text-teal' },
    { label: 'Approved Updates', value: approvedCount.toString(), icon: CheckCircle, color: 'text-success' },
    { label: 'Pending Updates', value: pendingCount.toString(), icon: Clock, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
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

      {activeModel && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Current Model — v{activeModel.version_number}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Architecture</p>
                <p className="font-mono text-sm font-medium text-foreground">{activeModel.architecture}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AUC</p>
                <p className="font-mono text-sm font-medium text-foreground">{activeModel.auc ? (activeModel.auc * 100).toFixed(1) + '%' : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">F1 Score</p>
                <p className="font-mono text-sm font-medium text-foreground">{activeModel.f1_score ? activeModel.f1_score.toFixed(3) : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
