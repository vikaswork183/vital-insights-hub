import { useData } from '@/context/DataProvider';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';

const statusConfig = (status: string) => {
  switch (status) {
    case 'approved': return { icon: CheckCircle, accent: 'success' };
    case 'rejected': return { icon: XCircle, accent: 'destructive' };
    default: return { icon: Clock, accent: 'warning' };
  }
};

export default function UpdateRequestsList() {
  const { updateRequests } = useData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">Submission History</h3>
          <p className="text-sm text-muted-foreground">Track your approved and pending local model updates</p>
        </div>
      </div>

      {/* Request list */}
      {updateRequests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
              <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-heading font-semibold text-foreground">No update requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Upload a dataset above to submit your first model update.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {updateRequests.map((req) => {
            const config = statusConfig(req.status);
            return (
              <div key={req.id} className="rounded-2xl border border-border bg-card shadow-card card-hover overflow-hidden">
                <div className={`h-0.5 ${req.status === 'approved' ? 'bg-success' : req.status === 'rejected' ? 'bg-destructive' : 'bg-warning'}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <config.icon className={`h-4 w-4 text-${config.accent}`} />
                      <h3 className="font-heading text-base font-bold text-foreground">{req.hospital_name}</h3>
                    </div>
                    <Badge className={`border border-${config.accent}/20 bg-${config.accent}/10 text-${config.accent} capitalize`}>{req.status}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    {[
                      { label: 'Trust Score', value: req.trust_score != null ? `${req.trust_score}/100` : 'N/A' },
                      { label: 'L2 Norm', value: req.l2_norm != null ? req.l2_norm.toFixed(4) : 'N/A' },
                      { label: 'Outlier %', value: req.clinical_outlier_pct != null ? `${(req.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A' },
                      { label: 'Submitted', value: formatDistanceToNow(new Date(req.created_at), { addSuffix: true }), mono: false },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl border border-border bg-secondary/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                        <p className={`mt-0.5 text-sm font-semibold text-foreground ${item.mono !== false ? 'font-mono' : ''}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {req.rejection_reason && (
                    <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5">
                      <p className="text-sm text-destructive"><span className="font-medium">Rejection:</span> {req.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
