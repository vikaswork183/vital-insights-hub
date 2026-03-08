import { useData } from '@/context/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const statusColor = (s: string) => {
  switch (s) {
    case 'active': return 'default';
    case 'ready': return 'secondary';
    case 'training': return 'outline';
    default: return 'secondary';
  }
};

export default function ModelManagement() {
  const { modelVersions, setSelectedModelVersion, selectedModelVersion, refreshModelVersions } = useData();
  const { toast } = useToast();

  const activateModel = async (id: string, versionNumber: number) => {
    // Deactivate all, then activate selected
    await supabase.from('model_versions').update({ status: 'archived' }).neq('id', id);
    await supabase.from('model_versions').update({ status: 'active' }).eq('id', id);
    await setSelectedModelVersion(versionNumber.toString());
    refreshModelVersions();
    toast({ title: `Model v${versionNumber} activated` });
  };

  if (modelVersions.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          No model versions yet. Train a model using the hospital agent.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {modelVersions.map((mv) => (
        <Card key={mv.id} className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Model v{mv.version_number}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">{mv.architecture}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusColor(mv.status)}>{mv.status}</Badge>
              {mv.version_number.toString() === selectedModelVersion && (
                <Badge className="bg-primary text-primary-foreground">Selected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-4 md:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="font-mono text-sm font-bold">{mv.accuracy ? `${(mv.accuracy * 100).toFixed(1)}%` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AUC</p>
                <p className="font-mono text-sm font-bold">{mv.auc ? `${(mv.auc * 100).toFixed(1)}%` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Precision</p>
                <p className="font-mono text-sm font-bold">{mv.precision_score?.toFixed(3) ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recall</p>
                <p className="font-mono text-sm font-bold">{mv.recall?.toFixed(3) ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">F1</p>
                <p className="font-mono text-sm font-bold">{mv.f1_score?.toFixed(3) ?? 'N/A'}</p>
              </div>
            </div>
            {mv.status !== 'active' && (
              <Button size="sm" variant="outline" onClick={() => activateModel(mv.id, mv.version_number)}>
                Activate
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
