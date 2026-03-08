import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '@/context/DataProvider';
import { Heart, LogOut, Shield, Activity, Stethoscope } from 'lucide-react';
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

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/70 backdrop-blur-2xl">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Heart className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground">Vital Sync</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Hospital</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:block">{profile?.hospital_name || profile?.full_name || user.email}</span>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Welcome header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Stethoscope className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-3xl font-bold text-foreground">Hospital Dashboard</h1>
          </div>
          <p className="ml-9 text-muted-foreground">Monitor your federated learning contributions and run predictions</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="glass-strong rounded-xl p-1">
            <TabsTrigger value="overview" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <Activity className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              Updates
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="predict" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              Predict
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in"><HospitalOverview /></TabsContent>
          <TabsContent value="updates" className="animate-fade-in"><UpdateRequestsList /></TabsContent>
          <TabsContent value="diagnostics" className="animate-fade-in"><DiagnosticsView /></TabsContent>
          <TabsContent value="predict" className="animate-fade-in"><PredictionForm /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
