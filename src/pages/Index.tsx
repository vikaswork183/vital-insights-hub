import { Link } from 'react-router-dom';
import { Shield, Activity, Brain, Lock, Users, BarChart3, ArrowRight, Heart, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataProvider';

const features = [
  {
    icon: Brain,
    title: 'FT-Transformer Model',
    description: 'State-of-the-art deep tabular architecture with attention-based feature interactions for ICU mortality prediction.',
    gradient: 'from-primary to-primary-glow',
  },
  {
    icon: Lock,
    title: 'Paillier Encryption',
    description: 'Homomorphic encryption ensures model updates are encrypted before transmission. Only aggregated results are decrypted.',
    gradient: 'from-accent to-teal-light',
  },
  {
    icon: Shield,
    title: 'Robust Aggregation',
    description: 'Multi-dimensional trust scoring with L2 norm clipping, outlier detection, and malicious update rejection.',
    gradient: 'from-warning to-destructive',
  },
  {
    icon: Users,
    title: 'Federated Learning',
    description: 'Hospitals collaboratively train a shared model without sharing any raw patient data.',
    gradient: 'from-primary to-accent',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Live dashboards with diagnostic charts, trust gauges, and model performance tracking.',
    gradient: 'from-teal to-cyan',
  },
  {
    icon: BarChart3,
    title: 'Clinical Analytics',
    description: 'Feature importance visualization, confusion matrices, and comprehensive evaluation metrics.',
    gradient: 'from-cyan to-primary',
  },
];

const stats = [
  { label: 'Target Accuracy', value: '~85%', icon: Zap },
  { label: 'ICU Features', value: '20+', icon: Activity },
  { label: 'Architecture', value: 'FT-Transformer', icon: Brain },
  { label: 'Privacy Level', value: 'Maximum', icon: Shield },
];

const archItems = [
  { title: 'Hospital Agent', desc: 'Local CSV ingestion, FT-Transformer training, delta extraction, Paillier encryption', port: '8002', color: 'bg-primary/10 text-primary' },
  { title: 'Backend Server', desc: 'Model versioning, update request handling, robust aggregation pipeline', port: '8000', color: 'bg-accent/10 text-accent' },
  { title: 'Keyholder Service', desc: 'Holds Paillier private key, decrypts only aggregated results', port: '8001', color: 'bg-warning/10 text-warning' },
  { title: 'Frontend Dashboard', desc: 'React + TypeScript with real-time sync, charts, and prediction UI', port: 'Web', color: 'bg-cyan/10 text-cyan' },
];

export default function Index() {
  const { user, isAdmin } = useData();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-2xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">Vital Sync</span>
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
                  <Button size="sm">Hospital Login</Button>
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
      <section className="relative overflow-hidden pt-16">
        <div className="bg-hero">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-glow" />
          <div className="absolute right-0 top-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute left-1/4 bottom-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="container relative z-10 flex flex-col items-center justify-center py-28 text-center md:py-36">
            <div className="animate-slide-up">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary-foreground/80 backdrop-blur-sm">
                <Shield className="h-3.5 w-3.5 text-primary-glow" />
                Privacy-Preserving Federated Learning
              </span>
            </div>
            <h1 className="animate-slide-up-delay-1 mb-6 max-w-4xl font-heading text-5xl font-bold leading-[1.1] tracking-tight text-primary-foreground md:text-7xl lg:text-8xl">
              Vital <span className="text-gradient">Sync</span>
            </h1>
            <p className="animate-slide-up-delay-2 mb-10 max-w-2xl text-lg leading-relaxed text-primary-foreground/60 md:text-xl">
              A federated learning platform enabling hospitals to collaboratively train
              ICU mortality prediction models — without sharing raw patient data.
            </p>
            <div className="animate-slide-up-delay-3 flex flex-wrap justify-center gap-4">
              <Link to={user ? '/hospital' : '/login'}>
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-primary-glow px-8 shadow-glow-sm transition-shadow hover:shadow-glow">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="border-primary-foreground/15 px-8 text-primary-foreground/80 backdrop-blur-sm hover:bg-primary-foreground/5">
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-b border-border bg-card py-14">
        <div className="bg-mesh absolute inset-0" />
        <div className="container relative grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="group text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground md:text-3xl">{stat.value}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 md:py-32">
        <div className="container">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full bg-primary/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              Features
            </span>
            <h2 className="mb-5 font-heading text-3xl font-bold text-foreground md:text-5xl">
              Enterprise-Grade Federated Learning
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Built with deep learning, homomorphic encryption, and robust aggregation
              to deliver accurate predictions while preserving patient privacy.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-card card-hover"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="border-t border-border bg-card py-24 md:py-32">
        <div className="container">
          <div className="mb-14 text-center">
            <span className="mb-4 inline-block rounded-full bg-accent/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
              Architecture
            </span>
            <h2 className="mb-5 font-heading text-3xl font-bold text-foreground md:text-4xl">System Architecture</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">Four interconnected services forming a privacy-preserving federated learning pipeline.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            {archItems.map((item) => (
              <div key={item.title} className="group rounded-2xl border border-border bg-background p-7 card-hover">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-lg font-semibold text-foreground">{item.title}</h3>
                  <span className={`rounded-lg ${item.color} px-3 py-1 font-mono text-xs font-medium`}>
                    :{item.port}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Flow diagram */}
          <div className="mx-auto mt-12 flex max-w-3xl items-center justify-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-primary">Hospital</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-lg bg-accent/10 px-3 py-1.5 text-accent">Encrypt</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-lg bg-warning/10 px-3 py-1.5 text-warning">Aggregate</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-lg bg-cyan/10 px-3 py-1.5 text-cyan">Decrypt</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-lg bg-success/10 px-3 py-1.5 text-success">Global Model</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Heart className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-foreground">Vital Sync</span>
            <span className="text-muted-foreground/60">— Federated Learning for ICU</span>
          </div>
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Privacy-First Healthcare AI
          </span>
        </div>
      </footer>
    </div>
  );
}
