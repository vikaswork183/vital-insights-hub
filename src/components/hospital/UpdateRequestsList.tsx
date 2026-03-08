import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, Clock, CheckCircle, XCircle } from 'lucide-react';

const statusConfig = (status: string) => {
  switch (status) {
    case 'approved': return { variant: 'default' as const, icon: CheckCircle, color: 'text-success' };
    case 'rejected': return { variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' };
    default: return { variant: 'secondary' as const, icon: Clock, color: 'text-warning' };
  }
};

export default function UpdateRequestsList() {
  const { updateRequests } = useData();

  if (updateRequests.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">No update requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Submit model updates from your hospital agent to see them here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {updateRequests.map((req) => {
        const config = statusConfig(req.status);
        return (
          <Card key={req.id} className="shadow-card card-hover overflow-hidden">
            <div className={`h-0.5 ${req.status === 'approved' ? 'bg-success' : req.status === 'rejected' ? 'bg-destructive' : 'bg-warning'}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <config.icon className={`h-4 w-4 ${config.color}`} />
                <CardTitle className="font-heading text-base">{req.hospital_name}</CardTitle>
              </div>
              <Badge variant={config.variant} className="capitalize">{req.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Trust Score', value: req.trust_score != null ? `${req.trust_score}/100` : 'N/A', highlight: true },
                  { label: 'L2 Norm', value: req.l2_norm != null ? req.l2_norm.toFixed(4) : 'N/A' },
                  { label: 'Outlier %', value: req.clinical_outlier_pct != null ? `${(req.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A' },
                  { label: 'Submitted', value: formatDistanceToNow(new Date(req.created_at), { addSuffix: true }), mono: false },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className={`mt-0.5 text-sm font-semibold text-foreground ${item.mono !== false ? 'font-mono' : ''}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              {req.rejection_reason && (
                <div className="mt-3 rounded-lg bg-destructive/5 border border-destructive/10 px-4 py-2.5">
                  <p className="text-sm text-destructive"><span className="font-medium">Rejection:</span> {req.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
