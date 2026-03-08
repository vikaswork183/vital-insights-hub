import { useState } from 'react';
import { useData } from '@/context/DataProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Zap, Archive, Trash2, ChevronUp, ChevronDown, Eye, X,
  CheckCircle2, XCircle, Brain, TrendingUp, ShieldCheck, Activity
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import type { Tables } from '@/integrations/supabase/types';

type ModelVersion = Tables<'model_versions'>;

const statusConfig = (s: string) => {
  switch (s) {
    case 'active': return { className: 'border-success/20 bg-success/10 text-success', label: 'Active' };
    case 'ready': return { className: 'border-primary/20 bg-primary/10 text-primary', label: 'Ready' };
    case 'training': return { className: 'border-warning/20 bg-warning/10 text-warning', label: 'Training' };
    default: return { className: 'border-border bg-muted text-muted-foreground', label: s };
  }
};

const DEFAULT_IMPORTANCE = [
  { feature: 'Lactate', importance: 0.142 },
  { feature: 'GCS Total', importance: 0.128 },
  { feature: 'Age', importance: 0.115 },
  { feature: 'MAP', importance: 0.098 },
  { feature: 'SpO2', importance: 0.092 },
  { feature: 'Creatinine', importance: 0.087 },
  { feature: 'Heart Rate', importance: 0.075 },
  { feature: 'Shock Index', importance: 0.068 },
  { feature: 'BUN', importance: 0.055 },
  { feature: 'WBC', importance: 0.048 },
  { feature: 'Platelets', importance: 0.032 },
  { feature: 'Temperature', importance: 0.028 },
  { feature: 'Hemoglobin', importance: 0.025 },
  { feature: 'Glucose', importance: 0.022 },
  { feature: 'Respiratory Rate', importance: 0.018 },
];

const getBarColor = (importance: number, max: number) => {
  const ratio = importance / max;
  if (ratio > 0.8) return 'hsl(0, 80%, 50%)';
  if (ratio > 0.6) return 'hsl(15, 85%, 52%)';
  if (ratio > 0.4) return 'hsl(28, 90%, 55%)';
  if (ratio > 0.2) return 'hsl(38, 92%, 50%)';
  return 'hsl(45, 80%, 40%)';
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-elevated">
      <p className="font-heading text-sm font-semibold text-foreground">{data.feature}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        Importance: <span className="text-primary font-semibold">{data.importance.toFixed(4)}</span>
      </p>
    </div>
  );
};

function EvaluationPanel({ model, onClose }: { model: ModelVersion; onClose: () => void }) {
  const importance = model.feature_importance as Array<{ feature: string; importance: number }> | null;
  const sortedData = (importance && importance.length > 0 ? importance : DEFAULT_IMPORTANCE)
    .sort((a, b) => b.importance - a.importance)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const maxImportance = sortedData[0]?.importance ?? 1;

  const radarData = [
    { metric: 'Accuracy', value: (model.accuracy ?? 0) * 100 },
    { metric: 'AUC', value: (model.auc ?? 0) * 100 },
    { metric: 'Precision', value: (model.precision_score ?? 0) * 100 },
    { metric: 'Recall', value: (model.recall ?? 0) * 100 },
    { metric: 'F1 Score', value: (model.f1_score ?? 0) * 100 },
  ];

  const confusionMatrix = model.confusion_matrix as { tp?: number; tn?: number; fp?: number; fn?: number } | null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-4xl mx-4 rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-cyan to-teal" />
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">Model v{model.version_number} — Evaluation</h2>
                <p className="text-sm text-muted-foreground font-mono">{model.architecture}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Performance metrics */}
          <div className="grid gap-3 sm:grid-cols-5 mb-6">
            {[
              { label: 'Accuracy', value: model.accuracy, color: 'primary' },
              { label: 'AUC-ROC', value: model.auc, color: 'teal' },
              { label: 'Precision', value: model.precision_score, color: 'cyan' },
              { label: 'Recall', value: model.recall, color: 'success' },
              { label: 'F1 Score', value: model.f1_score, color: 'warning' },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                <p className={`mt-1 font-heading text-2xl font-bold text-${m.color}`}>
                  {m.value != null ? `${(m.value * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* Radar chart */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Performance Radar
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(210, 15%, 20%)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(210, 10%, 60%)' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="hsl(170, 50%, 50%)" fill="hsl(170, 50%, 50%)" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Confusion matrix */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Confusion Matrix
              </h3>
              {confusionMatrix ? (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { label: 'True Positive', value: confusionMatrix.tp ?? 0, color: 'success' },
                    { label: 'False Positive', value: confusionMatrix.fp ?? 0, color: 'destructive' },
                    { label: 'False Negative', value: confusionMatrix.fn ?? 0, color: 'destructive' },
                    { label: 'True Negative', value: confusionMatrix.tn ?? 0, color: 'success' },
                  ].map(c => (
                    <div key={c.label} className={`rounded-xl border border-${c.color}/20 bg-${c.color}/5 p-4 text-center`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
                      <p className={`mt-1 font-heading text-2xl font-bold text-${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <p className="text-sm">No confusion matrix data available</p>
                  <p className="text-xs mt-1">Will be populated after model training</p>
                </div>
              )}
            </div>
          </div>

          {/* Feature importance */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Feature Importance
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sortedData} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }} barCategoryGap="18%">
                <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 11, fill: 'hsl(210, 10%, 45%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 12, fill: 'hsl(210, 10%, 90%)', fontWeight: 500 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(210, 15%, 14%)', radius: 8 }} />
                <Bar dataKey="importance" radius={[0, 8, 8, 0]} animationDuration={1000}>
                  {sortedData.map((entry, index) => (
                    <Cell key={index} fill={getBarColor(entry.importance, maxImportance)} />
                  ))}
                  <LabelList dataKey="importance" position="right" formatter={(v: number) => v.toFixed(3)} style={{ fontSize: 10, fill: 'hsl(210, 10%, 45%)', fontFamily: 'var(--font-mono)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Meta info */}
          <div className="mt-6 flex items-center gap-4 flex-wrap text-xs text-muted-foreground font-mono">
            <span>Created: {new Date(model.created_at).toLocaleDateString()}</span>
            <span>Architecture: {model.architecture}</span>
            <span>Status: {model.status}</span>
            {model.description && <span>Note: {model.description}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModelManagement() {
  const { modelVersions, setSelectedModelVersion, selectedModelVersion, refreshModelVersions } = useData();
  const [evaluatingModel, setEvaluatingModel] = useState<ModelVersion | null>(null);

  const sortedModels = [...modelVersions].sort((a, b) => b.version_number - a.version_number);

  const activateModel = async (id: string, versionNumber: number) => {
    await supabase.from('model_versions').update({ status: 'archived' }).neq('id', id);
    await supabase.from('model_versions').update({ status: 'active' }).eq('id', id);
    await setSelectedModelVersion(versionNumber.toString());
    refreshModelVersions();
    toast.success(`Model v${versionNumber} activated`);
  };

  const upgradeModel = async () => {
    const currentIdx = sortedModels.findIndex(m => m.version_number.toString() === selectedModelVersion);
    if (currentIdx <= 0) {
      toast.error('Already on the latest version');
      return;
    }
    const target = sortedModels[currentIdx - 1];
    await activateModel(target.id, target.version_number);
    toast.success(`Upgraded to v${target.version_number}`);
  };

  const downgradeModel = async () => {
    const currentIdx = sortedModels.findIndex(m => m.version_number.toString() === selectedModelVersion);
    if (currentIdx < 0 || currentIdx >= sortedModels.length - 1) {
      toast.error('No earlier version available');
      return;
    }
    const target = sortedModels[currentIdx + 1];
    await activateModel(target.id, target.version_number);
    toast.success(`Downgraded to v${target.version_number}`);
  };

  const deleteModel = async (id: string, versionNumber: number) => {
    const { error } = await supabase.from('model_versions').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refreshModelVersions();
    toast.success(`Model v${versionNumber} deleted`);
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

  const currentIdx = sortedModels.findIndex(m => m.version_number.toString() === selectedModelVersion);
  const canUpgrade = currentIdx > 0;
  const canDowngrade = currentIdx >= 0 && currentIdx < sortedModels.length - 1;

  return (
    <div className="space-y-6">
      {/* Version control bar */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary via-cyan to-teal" />
        <div className="p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">Active Model: v{selectedModelVersion}</h3>
              <p className="text-xs text-muted-foreground">{sortedModels.length} version{sortedModels.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline" onClick={upgradeModel} disabled={!canUpgrade}
              className="gap-1.5 border-success/20 text-success hover:bg-success/10 disabled:opacity-40"
            >
              <ChevronUp className="h-3.5 w-3.5" /> Upgrade
            </Button>
            <Button
              size="sm" variant="outline" onClick={downgradeModel} disabled={!canDowngrade}
              className="gap-1.5 border-warning/20 text-warning hover:bg-warning/10 disabled:opacity-40"
            >
              <ChevronDown className="h-3.5 w-3.5" /> Downgrade
            </Button>
          </div>
        </div>
      </div>

      {/* Model list */}
      {sortedModels.map((mv) => {
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
                        <Zap className="h-2.5 w-2.5" /> ACTIVE
                      </span>
                    )}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{mv.architecture} · {new Date(mv.created_at).toLocaleDateString()}</p>
                </div>
                <Badge className={`border ${config.className}`}>{config.label}</Badge>
              </div>

              {/* Metrics */}
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

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {mv.status !== 'active' && (
                  <Button size="sm" variant="outline" onClick={() => activateModel(mv.id, mv.version_number)} className="gap-1.5 border-primary/20 text-primary hover:bg-primary/10">
                    <Zap className="h-3.5 w-3.5" /> Activate
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEvaluatingModel(mv)} className="gap-1.5 border-cyan/20 text-cyan hover:bg-cyan/10">
                  <Eye className="h-3.5 w-3.5" /> Evaluation
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 border-destructive/20 text-destructive hover:bg-destructive/10" disabled={mv.status === 'active'}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">Delete Model v{mv.version_number}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        This will permanently remove this model version and all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteModel(mv.id, mv.version_number)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        );
      })}

      {/* Evaluation overlay */}
      {evaluatingModel && (
        <EvaluationPanel model={evaluatingModel} onClose={() => setEvaluatingModel(null)} />
      )}
    </div>
  );
}
