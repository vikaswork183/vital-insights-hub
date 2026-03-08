import { useData } from '@/context/DataProvider';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';

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
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-success/20 bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <p className="text-lg font-heading font-semibold text-foreground">All caught up!</p>
          <p className="mt-1 text-sm text-muted-foreground">No pending updates to review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4" />
        <span>{pending.length} update{pending.length !== 1 ? 's' : ''} awaiting review</span>
      </div>

      {pending.map((req) => (
        <div key={req.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden card-hover">
          <div className="h-0.5 bg-gradient-to-r from-warning to-warning/30" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">{req.hospital_name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                </p>
              </div>
              <Badge className="border border-warning/20 bg-warning/10 text-warning">Pending Review</Badge>
            </div>
            <div className="mb-5 grid gap-3 md:grid-cols-4">
              {[
                { label: 'Trust Score', value: req.trust_score ?? 'N/A', danger: req.trust_score != null && req.trust_score < 70 },
                { label: 'L2 Norm', value: req.l2_norm?.toFixed(4) ?? 'N/A', danger: req.l2_norm != null && req.l2_norm > 1.0 },
                { label: 'Outlier %', value: req.clinical_outlier_pct != null ? `${(req.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A', danger: req.clinical_outlier_pct != null && req.clinical_outlier_pct > 0.1 },
                { label: 'Key Match', value: req.key_fingerprint_match ? '✓ Verified' : '✗ Mismatch', danger: !req.key_fingerprint_match },
              ].map(item => (
                <div key={item.label} className={`rounded-xl border p-3.5 ${item.danger ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-secondary/50'}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className={`mt-0.5 font-mono text-sm font-bold ${item.danger ? 'text-destructive' : 'text-foreground'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button size="sm" onClick={() => handleAction(req.id, 'approved')} className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" onClick={() => handleAction(req.id, 'rejected', 'Failed trust assessment')} className="gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
