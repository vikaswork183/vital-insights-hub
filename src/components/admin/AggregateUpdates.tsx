import { useState } from 'react';
import { useData } from '@/context/DataProvider';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Layers, CheckCircle2, Hospital, ShieldCheck, Zap,
  ArrowRight, Loader2, AlertTriangle
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AggregateUpdates() {
  const { updateRequests, modelVersions, user, refreshModelVersions, refreshUpdateRequests } = useData();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAggregating, setIsAggregating] = useState(false);
  const [description, setDescription] = useState('');

  // Filter only approved updates that haven't been aggregated yet
  const approvedUpdates = updateRequests.filter(r => r.status === 'approved');

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === approvedUpdates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvedUpdates.map(u => u.id)));
    }
  };

  const handleAggregate = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one update to aggregate');
      return;
    }

    setIsAggregating(true);

    try {
      // Get next version number
      const maxVersion = modelVersions.reduce((max, m) => Math.max(max, m.version_number), 0);
      const newVersion = maxVersion + 1;

      // Calculate aggregated metrics from selected updates
      const selectedRequests = approvedUpdates.filter(u => selectedIds.has(u.id));
      const avgTrustScore = selectedRequests.reduce((sum, u) => sum + (u.trust_score ?? 0), 0) / selectedRequests.length;

      // Create new model version
      const { data: newModel, error: modelError } = await supabase
        .from('model_versions')
        .insert({
          version_number: newVersion,
          status: 'ready',
          architecture: 'ft-transformer',
          description: description || `Aggregated from ${selectedIds.size} hospital update${selectedIds.size > 1 ? 's' : ''}: ${selectedRequests.map(r => r.hospital_name).join(', ')}`,
          created_by: user?.id,
          // Simulated metrics - in production these would come from actual aggregation
          accuracy: 0.82 + Math.random() * 0.08,
          auc: 0.85 + Math.random() * 0.08,
          precision_score: 0.78 + Math.random() * 0.1,
          recall: 0.75 + Math.random() * 0.1,
          f1_score: 0.77 + Math.random() * 0.08,
          feature_importance: null,
          confusion_matrix: {
            tp: Math.floor(400 + Math.random() * 100),
            tn: Math.floor(3500 + Math.random() * 200),
            fp: Math.floor(80 + Math.random() * 40),
            fn: Math.floor(120 + Math.random() * 60),
          },
        })
        .select()
        .single();

      if (modelError) throw modelError;

      // Mark selected updates as aggregated
      const { error: updateError } = await supabase
        .from('update_requests')
        .update({ status: 'aggregated' })
        .in('id', Array.from(selectedIds));

      if (updateError) throw updateError;

      setSelectedIds(new Set());
      setDescription('');
      await refreshUpdateRequests();
      await refreshModelVersions();
      toast.success(`Model v${newVersion} created from ${selectedIds.size} hospital update${selectedIds.size > 1 ? 's' : ''}`);
    } catch (error: any) {
      toast.error(error.message || 'Aggregation failed');
    } finally {
      setIsAggregating(false);
    }
  };

  if (approvedUpdates.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-muted bg-muted/50">
            <Layers className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-heading font-semibold text-foreground">No approved updates</p>
          <p className="mt-1 text-sm text-muted-foreground">Approve hospital updates from the Pending tab first.</p>
        </div>
      </div>
    );
  }

  const selectedRequests = approvedUpdates.filter(u => selectedIds.has(u.id));
  const avgTrustScore = selectedRequests.length > 0
    ? selectedRequests.reduce((sum, u) => sum + (u.trust_score ?? 0), 0) / selectedRequests.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with aggregate action */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-cyan to-teal" />
        <div className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">Aggregate Hospital Updates</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedIds.size} of {approvedUpdates.length} selected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={selectAll}
                className="gap-1.5"
              >
                {selectedIds.size === approvedUpdates.length ? 'Deselect All' : 'Select All'}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={selectedIds.size === 0 || isAggregating}
                    className="gap-1.5 bg-gradient-to-r from-primary to-cyan hover:opacity-90"
                  >
                    {isAggregating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Create New Model Version
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-border bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-heading">Create New Global Model</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This will aggregate {selectedIds.size} hospital update{selectedIds.size > 1 ? 's' : ''} into a new model version.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Selected Hospitals</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequests.map(r => (
                          <Badge key={r.id} variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                            <Hospital className="h-3 w-3 mr-1" />
                            {r.hospital_name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-secondary/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Trust Score</p>
                        <p className="mt-0.5 font-mono text-lg font-bold text-foreground">{avgTrustScore.toFixed(1)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-secondary/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Updates Count</p>
                        <p className="mt-0.5 font-mono text-lg font-bold text-foreground">{selectedIds.size}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
                      <Input
                        placeholder="Add notes about this version..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-secondary/50 border-border"
                      />
                    </div>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAggregate} className="bg-gradient-to-r from-primary to-cyan">
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      Aggregate & Create v{modelVersions.reduce((max, m) => Math.max(max, m.version_number), 0) + 1}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Selection summary */}
          {selectedIds.size > 0 && (
            <div className="mt-4 rounded-xl border border-success/20 bg-success/5 p-4 flex items-center gap-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Ready to aggregate {selectedIds.size} update{selectedIds.size > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Hospitals: {selectedRequests.map(r => r.hospital_name).join(', ')}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">New Version</p>
                <p className="font-mono font-bold text-success">v{modelVersions.reduce((max, m) => Math.max(max, m.version_number), 0) + 1}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update list */}
      <div className="space-y-3">
        {approvedUpdates.map((req) => {
          const isSelected = selectedIds.has(req.id);
          const hasTrustWarning = (req.trust_score ?? 0) < 80;

          return (
            <div
              key={req.id}
              onClick={() => toggleSelection(req.id)}
              className={`rounded-2xl border bg-card shadow-card overflow-hidden cursor-pointer transition-all card-hover ${
                isSelected
                  ? 'border-primary/40 ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border hover:border-primary/20'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(req.id)}
                    className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Hospital className="h-4 w-4 text-primary" />
                        <h3 className="font-heading text-base font-bold text-foreground">{req.hospital_name}</h3>
                        <Badge className="border-success/20 bg-success/10 text-success text-[10px]">
                          Approved
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="grid gap-2 md:grid-cols-4">
                      <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Trust Score</p>
                        <div className="flex items-center gap-1.5">
                          {hasTrustWarning && <AlertTriangle className="h-3 w-3 text-warning" />}
                          <p className={`font-mono text-sm font-bold ${hasTrustWarning ? 'text-warning' : 'text-foreground'}`}>
                            {req.trust_score?.toFixed(1) ?? 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">L2 Norm</p>
                        <p className="font-mono text-sm font-bold text-foreground">{req.l2_norm?.toFixed(4) ?? 'N/A'}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Outlier %</p>
                        <p className="font-mono text-sm font-bold text-foreground">
                          {req.clinical_outlier_pct != null ? `${(req.clinical_outlier_pct * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Key Match</p>
                        <p className="font-mono text-sm font-bold text-foreground flex items-center gap-1">
                          {req.key_fingerprint_match ? (
                            <>
                              <ShieldCheck className="h-3 w-3 text-success" />
                              Verified
                            </>
                          ) : (
                            'Mismatch'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
