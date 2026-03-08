import { Link } from 'react-router-dom';
import { Shield, Lock, Brain, Layers, Clock, ArrowRight, Heart, Activity } from 'lucide-react';
import { useData } from '@/context/DataProvider';

const pills = [
  { icon: Lock, label: 'Paillier HE' },
  { icon: Brain, label: 'Local Training' },
  { icon: Layers, label: 'Federated Aggregation' },
  { icon: Clock, label: 'Manual Approval' },
];

export default function Index() {
  const { user, isAdmin } = useData();

  return (
    <div className="min-h-screen bg-[hsl(210,20%,8%)] text-[hsl(210,10%,90%)] overflow-hidden">
      {/* Navbar */}
      <nav className="relative z-50 border-b border-[hsl(210,15%,15%)]">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Heart className="h-6 w-6 text-accent" />
            <span className="font-heading text-lg font-bold tracking-tight">Vital Sync</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/hospital" className="text-sm text-[hsl(210,10%,60%)] hover:text-[hsl(210,10%,90%)] transition-colors">
                  Hospital Portal
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-sm text-[hsl(210,10%,60%)] hover:text-[hsl(210,10%,90%)] transition-colors">
                    Admin Portal
                  </Link>
                )}
              </>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        {/* Radial gradient background */}
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-[hsl(170,50%,30%)] opacity-[0.06] blur-[150px]" />
          <div className="absolute left-1/4 top-1/2 h-[400px] w-[400px] rounded-full bg-[hsl(210,60%,40%)] opacity-[0.04] blur-[120px]" />
        </div>

        <div className="container relative z-10 flex flex-col items-center pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="animate-slide-up mb-10">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-accent">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              Privacy-Preserving AI
            </span>
          </div>

          {/* Title */}
          <h1 className="animate-slide-up-delay-1 mb-8 max-w-5xl font-heading leading-[1.05]">
            <span className="block text-5xl font-bold text-accent md:text-7xl lg:text-[5.5rem]">
              Federated Learning
            </span>
            <span className="block text-5xl font-bold text-[hsl(210,10%,85%)] md:text-7xl lg:text-[5.5rem]">
              for ICU Mortality
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-slide-up-delay-2 mb-12 max-w-2xl text-lg leading-relaxed text-[hsl(210,10%,50%)] md:text-xl">
            Collaborative model training across hospitals with Paillier homomorphic
            encryption. Patient data never leaves the hospital.
          </p>

          {/* Feature pills */}
          <div className="animate-slide-up-delay-3 mb-20 flex flex-wrap justify-center gap-3">
            {pills.map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-2 rounded-full border border-[hsl(210,15%,20%)] bg-[hsl(210,18%,11%)] px-5 py-2.5 text-sm text-[hsl(210,10%,60%)] transition-colors hover:border-accent/30 hover:text-accent"
              >
                <pill.icon className="h-4 w-4" />
                {pill.label}
              </span>
            ))}
          </div>

          {/* Portal cards */}
          <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
            {/* Admin Portal */}
            <Link
              to={user && isAdmin ? '/admin' : '/admin/login'}
              className="group relative rounded-2xl border border-[hsl(190,40%,20%)] bg-[hsl(210,18%,10%)] p-8 text-left transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_40px_hsl(170,50%,30%,0.08)]"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <Shield className="mb-6 h-10 w-10 text-accent/60 transition-colors group-hover:text-accent" strokeWidth={1.5} />
                <h3 className="mb-2 font-heading text-xl font-bold text-[hsl(210,10%,90%)]">Admin Portal</h3>
                <p className="mb-6 text-sm leading-relaxed text-[hsl(210,10%,45%)]">
                  Manage model updates, approve requests, evaluate models
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all group-hover:gap-3">
                  Enter <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Hospital Portal */}
            <Link
              to={user ? '/hospital' : '/login'}
              className="group relative rounded-2xl border border-[hsl(150,30%,20%)] bg-[hsl(210,18%,10%)] p-8 text-left transition-all duration-300 hover:border-success/40 hover:shadow-[0_0_40px_hsl(150,50%,30%,0.08)]"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-success/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <Activity className="mb-6 h-10 w-10 text-success/60 transition-colors group-hover:text-success" strokeWidth={1.5} />
                <h3 className="mb-2 font-heading text-xl font-bold text-[hsl(210,10%,90%)]">Hospital Portal</h3>
                <p className="mb-6 text-sm leading-relaxed text-[hsl(210,10%,45%)]">
                  Upload data, train locally, submit encrypted updates
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-success transition-all group-hover:gap-3">
                  Enter <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(210,15%,13%)] py-8 mt-12">
        <div className="container text-center">
          <p className="text-xs text-[hsl(210,10%,35%)]">
            ICU Federated Learning · Manual Approval Demo · 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
