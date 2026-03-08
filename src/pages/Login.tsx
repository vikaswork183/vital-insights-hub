import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Loader2, Stethoscope } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/context/DataProvider';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useData();

  useEffect(() => {
    if (user) navigate('/hospital');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back!' });
        navigate('/hospital');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser && hospitalName) {
          await supabase.from('profiles').update({ hospital_name: hospitalName, full_name: fullName }).eq('user_id', newUser.id);
        }

        toast({ title: 'Account created!', description: 'You may need to verify your email.' });
        navigate('/hospital');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 bg-mesh pointer-events-none" />
      <div className="fixed right-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="fixed left-1/4 bottom-1/4 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />

      <Card className="relative w-full max-w-md shadow-elevated border-border/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary-glow to-accent" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow-sm">
            <Stethoscope className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">{isLogin ? 'Hospital Sign In' : 'Create Account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Access your hospital portal' : 'Join the federated learning network'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalName">Hospital Name</Label>
                  <Input id="hospitalName" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="e.g., City General Hospital" className="h-11" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-primary-glow shadow-glow-sm hover:shadow-glow transition-shadow" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <a href="/admin/login" className="font-medium text-destructive hover:underline">Admin Login →</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
