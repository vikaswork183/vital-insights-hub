import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '@/context/DataProvider';
import { Heart, LogOut, Shield, Activity, Stethoscope, MonitorSpeaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HospitalOverview from '@/components/hospital/HospitalOverview';
import UpdateRequestsList from '@/components/hospital/UpdateRequestsList';
import PredictionForm from '@/components/prediction/PredictionForm';
import DiagnosticsView from '@/components/hospital/DiagnosticsView';
import ICUMonitor from '@/components/hospital/ICUMonitor';

export default function Hospital() {
  const { user, profile, isAdmin, isLoading, signOut } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate('/login');
  }, [user, isLoading, navigate]);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-mesh pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-2xl">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <Heart className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-heading font-bold text-foreground">Vital Sync</span>
            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Hospital</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:block">{profile?.hospital_name || profile?.full_name || user.email}</span>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
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

      <main className="container relative z-10 py-8">
        {/* Welcome header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Stethoscope className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-3xl font-bold text-foreground">Hospital Dashboard</h1>
          </div>
          <p className="ml-9 text-muted-foreground">Monitor your federated learning contributions and run predictions</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="border border-border bg-card/80 backdrop-blur-xl rounded-xl p-1">
            <TabsTrigger value="overview" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Activity className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="train-upload" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Train & Upload
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="predict" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Predict
            </TabsTrigger>
            <TabsTrigger value="icu-monitor" className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <MonitorSpeaker className="h-3.5 w-3.5" /> ICU Monitor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in"><HospitalOverview /></TabsContent>
          <TabsContent value="train-upload" className="animate-fade-in"><TrainAndUpload /></TabsContent>
          <TabsContent value="diagnostics" className="animate-fade-in"><UpdateRequestsList /></TabsContent>
          <TabsContent value="predict" className="animate-fade-in"><PredictionForm /></TabsContent>
          <TabsContent value="icu-monitor" className="animate-fade-in"><ICUMonitor /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
