import { useData } from '@/context/DataProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

export default function PendingUpdates() {
  const { updateRequests, user, refreshUpdateRequests } = useData();
  const { toast } = useToast();

  const pending = updateRequests.filter(r => r.status === 'pending');

  const handleAction = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    const { error } = await supabase.from('update_requests').update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
      rejection_reason: reason || null,
    }).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Update ${status}` });
      refreshUpdateRequests();
    }
  };

  if (pending.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          No pending updates to review.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((req) => (
        <Card key={req.id} className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{req.hospital_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge variant="secondary">Pending</Badge>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Trust Score</p>
                <p className={`font-mono text-lg font-bold ${
                  (req.trust_score ?? 0) >= 70 ? 'text-success' : 'text-destructive'
                }`}>{req.trust_score ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">L2 Norm</p>
                <p className="font-mono text-sm">{req.l2_norm?.toFixed(4) ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outlier %</p>
                <p className="font-mono text-sm">{req.clinical_outlier_pct != null ? `${(req.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Key Match</p>
                <p className="font-mono text-sm">{req.key_fingerprint_match ? '✓' : '✗'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" onClick={() => handleAction(req.id, 'approved')} className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction(req.id, 'rejected', 'Failed trust assessment')} className="gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
