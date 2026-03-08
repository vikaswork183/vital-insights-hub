import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '@/context/DataProvider';
import { Heart, LogOut, Hospital, ShieldCheck, BarChart3, Settings, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminOverview from '@/components/admin/AdminOverview';
import PendingUpdates from '@/components/admin/PendingUpdates';
import ModelManagement from '@/components/admin/ModelManagement';
import FeatureImportance from '@/components/admin/FeatureImportance';

export default function Admin() {
  const { user, isAdmin, isLoading, signOut } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/admin/login');
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading admin...</p>
      </div>
    </div>
  );
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/70 backdrop-blur-2xl">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-destructive to-warning">
              <Heart className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground">Vital Sync</span>
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/hospital">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Hospital className="h-3.5 w-3.5" /> Hospital
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="h-6 w-6 text-destructive" />
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <p className="ml-9 text-muted-foreground">Manage model versions, review updates, and monitor the federated learning network</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="glass-strong rounded-xl p-1">
            <TabsTrigger value="overview" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <FileCheck className="h-3.5 w-3.5" /> Pending
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <Settings className="h-3.5 w-3.5" /> Models
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in"><AdminOverview /></TabsContent>
          <TabsContent value="pending" className="animate-fade-in"><PendingUpdates /></TabsContent>
          <TabsContent value="models" className="animate-fade-in"><ModelManagement /></TabsContent>
          <TabsContent value="features" className="animate-fade-in"><FeatureImportance /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
