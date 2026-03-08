import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '@/context/DataProvider';
import { Heart, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HospitalOverview from '@/components/hospital/HospitalOverview';
import UpdateRequestsList from '@/components/hospital/UpdateRequestsList';
import PredictionForm from '@/components/prediction/PredictionForm';
import DiagnosticsView from '@/components/hospital/DiagnosticsView';

export default function Hospital() {
  const { user, profile, isAdmin, isLoading, signOut } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate('/login');
  }, [user, isLoading, navigate]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Vital Sync</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Hospital</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{profile?.hospital_name || profile?.full_name || user.email}</span>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Hospital Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Monitor your federated learning contributions and run predictions</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="updates">My Updates</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="predict">Predict</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><HospitalOverview /></TabsContent>
          <TabsContent value="updates"><UpdateRequestsList /></TabsContent>
          <TabsContent value="diagnostics"><DiagnosticsView /></TabsContent>
          <TabsContent value="predict"><PredictionForm /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
