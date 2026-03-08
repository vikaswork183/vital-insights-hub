import { useData } from '@/context/DataProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Zap, Archive } from 'lucide-react';

const statusConfig = (s: string) => {
  switch (s) {
    case 'active': return { className: 'border-success/20 bg-success/10 text-success' };
    case 'ready': return { className: 'border-primary/20 bg-primary/10 text-primary' };
    case 'training': return { className: 'border-warning/20 bg-warning/10 text-warning' };
    default: return { className: 'border-border bg-muted text-muted-foreground' };
  }
};

export default function ModelManagement() {
  const { modelVersions, setSelectedModelVersion, selectedModelVersion, refreshModelVersions } = useData();
  const { toast } = useToast();

  const activateModel = async (id: string, versionNumber: number) => {
    await supabase.from('model_versions').update({ status: 'archived' }).neq('id', id);
    await supabase.from('model_versions').update({ status: 'active' }).eq('id', id);
    await setSelectedModelVersion(versionNumber.toString());
    refreshModelVersions();
    toast({ title: `Model v${versionNumber} activated` });
  };

  if (modelVersions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
            <Archive className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-heading font-semibold text-foreground">No model versions</p>
          <p className="mt-1 text-sm text-muted-foreground">Train a model using the hospital agent to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modelVersions.map((mv) => {
        const config = statusConfig(mv.status);
        const isSelected = mv.version_number.toString() === selectedModelVersion;

        return (
          <div key={mv.id} className={`rounded-2xl border bg-card shadow-card overflow-hidden card-hover ${isSelected ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'}`}>
            {mv.status === 'active' && <div className="h-0.5 bg-gradient-to-r from-success via-primary to-teal" />}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                    Model v{mv.version_number}
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Zap className="h-2.5 w-2.5" /> SELECTED
                      </span>
                    )}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{mv.architecture}</p>
                </div>
                <Badge className={`border ${config.className}`}>{mv.status}</Badge>
              </div>
              <div className="mb-4 grid gap-3 md:grid-cols-5">
                {[
                  { label: 'Accuracy', value: mv.accuracy ? `${(mv.accuracy * 100).toFixed(1)}%` : 'N/A' },
                  { label: 'AUC', value: mv.auc ? `${(mv.auc * 100).toFixed(1)}%` : 'N/A' },
                  { label: 'Precision', value: mv.precision_score?.toFixed(3) ?? 'N/A' },
                  { label: 'Recall', value: mv.recall?.toFixed(3) ?? 'N/A' },
                  { label: 'F1', value: mv.f1_score?.toFixed(3) ?? 'N/A' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-border bg-secondary/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              {mv.status !== 'active' && (
                <Button size="sm" variant="outline" onClick={() => activateModel(mv.id, mv.version_number)} className="gap-1.5 border-primary/20 text-primary hover:bg-primary/10">
                  <Zap className="h-3.5 w-3.5" /> Activate
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
