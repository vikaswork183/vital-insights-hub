import { Link } from 'react-router-dom';
import { Shield, Activity, Brain, Lock, Users, BarChart3, ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataProvider';

const features = [
  {
    icon: Brain,
    title: 'FT-Transformer Model',
    description: 'State-of-the-art deep tabular architecture for ICU mortality prediction with attention-based feature interactions.',
  },
  {
    icon: Lock,
    title: 'Paillier Encryption',
    description: 'Homomorphic encryption ensures model updates are encrypted before transmission. Only aggregated results are decrypted.',
  },
  {
    icon: Shield,
    title: 'Robust Aggregation',
    description: 'Multi-dimensional trust scoring with L2 norm clipping, outlier detection, and malicious update rejection.',
  },
  {
    icon: Users,
    title: 'Federated Learning',
    description: 'Hospitals collaboratively train a shared model without sharing any raw patient data.',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Live dashboards with diagnostic charts, trust gauges, and model performance tracking.',
  },
  {
    icon: BarChart3,
    title: 'Clinical Analytics',
    description: 'Feature importance visualization, confusion matrices, and comprehensive evaluation metrics.',
  },
];

const stats = [
  { label: 'Target Accuracy', value: '~85%' },
  { label: 'ICU Features', value: '20+' },
  { label: 'Architecture', value: 'FT-Transformer' },
  { label: 'Privacy Level', value: 'Maximum' },
];

export default function Index() {
  const { user, isAdmin } = useData();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">Vital Sync</span>
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
            ) : (
              <Link to="/login">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="bg-hero">
          <div className="bg-glow">
            <div className="container relative z-10 flex flex-col items-center justify-center py-32 text-center">
              <div className="animate-slide-up">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  Privacy-Preserving Federated Learning
                </span>
              </div>
              <h1 className="animate-slide-up-delay-1 mb-6 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-primary-foreground md:text-7xl">
                Vital <span className="text-gradient">Sync</span>
              </h1>
              <p className="animate-slide-up-delay-2 mb-10 max-w-2xl text-lg text-primary-foreground/70">
                A federated learning platform enabling hospitals to collaboratively train
                ICU mortality prediction models without sharing raw patient data.
              </p>
              <div className="animate-slide-up-delay-3 flex gap-4">
                <Link to={user ? '/hospital' : '/login'}>
                  <Button size="lg" className="gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" size="lg" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                    Learn More
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card py-12">
        <div className="container grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Enterprise-Grade Federated Learning
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Built with state-of-the-art deep learning, homomorphic encryption, and robust aggregation
              to deliver accurate ICU mortality predictions while preserving patient privacy.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="border-t border-border bg-card py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">System Architecture</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {[
              { title: 'Hospital Agent', desc: 'Local CSV ingestion, FT-Transformer training, delta extraction, Paillier encryption', port: '8002' },
              { title: 'Backend Server', desc: 'Model versioning, update request handling, robust aggregation pipeline', port: '8000' },
              { title: 'Keyholder Service', desc: 'Holds Paillier private key, decrypts only aggregated results', port: '8001' },
              { title: 'Frontend Dashboard', desc: 'React + TypeScript with real-time Supabase sync, charts, and prediction UI', port: 'Web' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-background p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    :{item.port}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span>Vital Sync — Federated Learning for ICU</span>
          </div>
          <span>Privacy-First Healthcare AI</span>
        </div>
      </footer>
    </div>
  );
}
