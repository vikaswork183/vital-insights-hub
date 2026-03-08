import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '@/context/DataProvider';
import { Heart, LogOut, Hospital } from 'lucide-react';
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
    if (!isLoading && (!user || !isAdmin)) navigate('/hospital');
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Vital Sync</span>
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/hospital">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Hospital className="h-3.5 w-3.5" /> Hospital
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Manage model versions, review updates, and monitor the federated learning network</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending">Pending Updates</TabsTrigger>
            <TabsTrigger value="models">Model Versions</TabsTrigger>
            <TabsTrigger value="features">Feature Importance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><AdminOverview /></TabsContent>
          <TabsContent value="pending"><PendingUpdates /></TabsContent>
          <TabsContent value="models"><ModelManagement /></TabsContent>
          <TabsContent value="features"><FeatureImportance /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
