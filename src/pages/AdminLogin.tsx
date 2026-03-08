import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/context/DataProvider';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isLoading } = useData();

  useEffect(() => {
    if (!isLoading && user && isAdmin) navigate('/admin');
  }, [user, isAdmin, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (!loggedInUser) throw new Error('Login failed');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', loggedInUser.id)
        .eq('role', 'admin');

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        throw new Error('Access denied. This portal is for administrators only.');
      }

      toast({ title: 'Welcome, Admin!' });
      navigate('/admin');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="fixed inset-0 bg-mesh pointer-events-none" />
      <div className="fixed right-1/3 top-1/3 h-[400px] w-[400px] rounded-full bg-destructive/[0.03] blur-[120px]" />
      <div className="fixed left-1/3 bottom-1/3 h-[300px] w-[300px] rounded-full bg-warning/[0.03] blur-[100px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="h-0.5 absolute top-0 left-0 right-0 rounded-t-2xl bg-gradient-to-r from-destructive via-warning to-destructive/50" />

        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
            <Shield className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">Access the administration portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-secondary border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 bg-secondary border-border text-foreground" />
          </div>
          <Button type="submit" className="w-full h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all font-semibold" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In as Admin
          </Button>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:text-primary-glow transition-colors">← Hospital Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
