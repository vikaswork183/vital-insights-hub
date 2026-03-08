import { Link } from 'react-router-dom';
import { Shield, Activity, Brain, Lock, Users, BarChart3, ArrowRight, Heart, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataProvider';

const features = [
  {
    icon: Brain,
    title: 'FT-Transformer Model',
    description: 'Attention-based deep tabular architecture that captures complex feature interactions for ICU mortality prediction.',
  },
  {
    icon: Lock,
    title: 'Paillier Encryption',
    description: 'Homomorphic encryption protects model updates in transit — only aggregated results are ever decrypted.',
  },
  {
    icon: Shield,
    title: 'Robust Aggregation',
    description: 'Trust scoring, L2 norm clipping, outlier detection, and automatic rejection of malicious updates.',
  },
  {
    icon: Users,
    title: 'Federated Learning',
    description: 'Hospitals train collaboratively without sharing a single row of patient data.',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Live dashboards with trust gauges, diagnostic charts, and model performance tracking.',
  },
  {
    icon: BarChart3,
    title: 'Clinical Analytics',
    description: 'Feature importance, confusion matrices, and comprehensive evaluation metrics at a glance.',
  },
];

const stats = [
  { label: 'Target Accuracy', value: '~85%', icon: Zap },
  { label: 'ICU Features', value: '20+', icon: Activity },
  { label: 'Architecture', value: 'FT-Transformer', icon: Brain },
  { label: 'Privacy Level', value: 'Maximum', icon: Shield },
];

export default function Index() {
  const { user, isAdmin } = useData();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow-sm">
              <Heart className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-foreground">Vital Sync</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/hospital">
                  <Button variant="ghost" size="sm">Hospital Portal</Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm">Admin Portal</Button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow shadow-glow-sm">Hospital Login</Button>
                </Link>
                <Link to="/admin/login">
                  <Button size="sm" variant="outline">Admin Login</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16">
        <div className="bg-hero min-h-[85vh] flex items-center">
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px] animate-pulse-slow" />
            <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-accent/6 blur-[100px] animate-float" />
            <div className="absolute left-1/3 bottom-0 h-[300px] w-[300px] rounded-full bg-cyan/5 blur-[80px] animate-pulse-slow" />
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.03) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />

          <div className="container relative z-10 flex flex-col items-center justify-center py-20 text-center">
            <div className="animate-slide-up">
              <span className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary-foreground/80 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-primary-glow" />
                Privacy-Preserving Federated Learning
              </span>
            </div>
            <h1 className="animate-slide-up-delay-1 mb-8 max-w-5xl font-heading text-6xl font-bold leading-[1.05] tracking-tight text-primary-foreground md:text-8xl lg:text-[7rem]">
              Vital <span className="text-gradient">Sync</span>
            </h1>
            <p className="animate-slide-up-delay-2 mb-12 max-w-2xl text-lg leading-relaxed text-primary-foreground/50 md:text-xl">
              Hospitals collaboratively train ICU mortality prediction models —
              without ever sharing raw patient data.
            </p>
            <div className="animate-slide-up-delay-3 flex flex-wrap justify-center gap-4">
              <Link to={user ? '/hospital' : '/login'}>
                <Button size="lg" className="h-13 gap-2.5 bg-gradient-to-r from-primary to-primary-glow px-10 text-base shadow-glow transition-all hover:shadow-[0_0_60px_hsl(var(--primary)/0.3)] hover:scale-[1.02]">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="h-13 border-primary-foreground/10 px-10 text-base text-primary-foreground/70 backdrop-blur-md hover:bg-primary-foreground/5 hover:border-primary-foreground/20">
                  Explore Features
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-b border-border/50 bg-card/50 py-16 backdrop-blur-sm">
        <div className="container grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className="group relative text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-sm">
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="font-heading text-3xl font-bold text-foreground md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-28 md:py-36">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-mesh" />
        
        <div className="container relative">
          <div className="mb-20 text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/8 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> Core Capabilities
            </span>
            <h2 className="mb-6 font-heading text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
              Enterprise-Grade
              <br />
              <span className="text-gradient">Federated Learning</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Deep learning, homomorphic encryption, and robust aggregation — delivering
              accurate predictions while preserving patient privacy.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 p-8 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:shadow-elevated hover:-translate-y-1"
              >
                {/* Hover glow */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-primary/8 to-accent/8 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                
                <div className="relative">
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary transition-all duration-300 group-hover:from-primary group-hover:to-primary-glow group-hover:text-primary-foreground group-hover:shadow-glow-sm group-hover:scale-110">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 font-heading text-xl font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/50 py-28">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 bg-glow" />
        <div className="container relative z-10 text-center">
          <h2 className="mb-6 font-heading text-3xl font-bold text-primary-foreground md:text-5xl">
            Ready to protect patient privacy?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-primary-foreground/50">
            Join the federated learning network and start training models collaboratively — your data never leaves your hospital.
          </p>
          <Link to={user ? '/hospital' : '/login'}>
            <Button size="lg" className="h-13 gap-2.5 bg-gradient-to-r from-primary to-primary-glow px-10 text-base shadow-glow transition-all hover:shadow-[0_0_60px_hsl(var(--primary)/0.3)] hover:scale-[1.02]">
              Get Started Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 py-10 backdrop-blur-sm">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Heart className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-foreground">Vital Sync</span>
          </div>
          <span className="text-muted-foreground/60">Privacy-First Healthcare AI</span>
        </div>
      </footer>
    </div>
  );
}
