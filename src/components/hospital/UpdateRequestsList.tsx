import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const statusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

export default function UpdateRequestsList() {
  const { updateRequests } = useData();

  if (updateRequests.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          No update requests yet. Submit model updates from your hospital agent.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {updateRequests.map((req) => (
        <Card key={req.id} className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{req.hospital_name}</CardTitle>
            <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Trust Score</p>
                <p className="font-mono text-sm font-semibold">{req.trust_score != null ? `${req.trust_score}/100` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">L2 Norm</p>
                <p className="font-mono text-sm font-semibold">{req.l2_norm != null ? req.l2_norm.toFixed(4) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outlier %</p>
                <p className="font-mono text-sm font-semibold">{req.clinical_outlier_pct != null ? `${(req.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</p>
              </div>
            </div>
            {req.rejection_reason && (
              <p className="mt-3 text-sm text-destructive">Rejection: {req.rejection_reason}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
