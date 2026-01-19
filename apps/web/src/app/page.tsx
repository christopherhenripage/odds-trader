import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Bell,
  Wallet,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Activity,
  Cpu,
  Radio,
  Target,
  Sparkles,
} from 'lucide-react';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[128px] animate-pulse-slow" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-neon-green/10 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Header */}
      <header className="relative border-b border-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="h-8 w-8 text-neon-green" />
              <div className="absolute inset-0 blur-md bg-neon-green/50 animate-pulse-slow" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-neon-green">ODDS</span>
              <span className="text-white/80">TRADER</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            {session ? (
              <Button asChild className="btn-neon bg-neon-green hover:bg-neon-green/90 text-black font-semibold">
                <Link href="/dashboard">
                  Launch App <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="btn-neon bg-neon-green hover:bg-neon-green/90 text-black font-semibold">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4">
        <div className="container mx-auto text-center max-w-5xl">
          {/* Live indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-neon-green/30 bg-neon-green/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
              </span>
              <span className="text-sm text-neon-green font-mono">SCANNER ACTIVE</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex justify-center gap-3 mb-8">
            <Badge variant="arb" className="badge-arb px-4 py-1.5 text-sm font-mono">ARB</Badge>
            <Badge variant="middle" className="badge-middle px-4 py-1.5 text-sm font-mono">MIDDLE</Badge>
            <Badge variant="paper" className="badge-paper px-4 py-1.5 text-sm font-mono">PAPER</Badge>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text-neon">Find Betting Edges</span>
            <br />
            <span className="text-white">Before They Disappear</span>
          </h1>

          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Real-time arbitrage and middle scanner across sportsbooks.
            Get instant alerts, paper trade with realistic simulation,
            and never miss an opportunity again.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild className="btn-neon bg-neon-green hover:bg-neon-green/90 text-black font-semibold text-lg px-8 h-14">
              <Link href="/auth/signin">
                Get Started Free <Sparkles className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/20 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 text-white h-14 px-8">
              <Link href="#features">
                <Cpu className="mr-2 h-5 w-5" /> How It Works
              </Link>
            </Button>
          </div>

          {/* Terminal-style preview */}
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-purple rounded-lg blur opacity-25" />
            <div className="relative bg-black border border-white/10 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-xs text-white/40 font-mono">odds-trader — scanner</span>
              </div>
              <div className="p-6 font-mono text-sm text-left space-y-2">
                <div className="text-white/40">$ scanning 50+ sports...</div>
                <div className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span className="text-white/80">NBA: Lakers vs Celtics</span>
                  <span className="text-neon-green font-bold">+2.3% ARB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neon-cyan">✓</span>
                  <span className="text-white/80">NFL: Chiefs vs Bills</span>
                  <span className="text-neon-cyan font-bold">3.5pt MIDDLE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span className="text-white/80">NCAAB: Duke vs UNC</span>
                  <span className="text-neon-green font-bold">+1.8% ARB</span>
                </div>
                <div className="text-neon-purple animate-pulse">▌ Processing opportunities...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 px-4 border-y border-white/5">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="stat-value text-4xl font-bold text-neon-green mb-2 group-hover:animate-pulse">10s</div>
              <div className="text-sm text-white/40 uppercase tracking-wider">Scan Interval</div>
            </div>
            <div className="group">
              <div className="stat-value text-4xl font-bold text-neon-cyan mb-2 group-hover:animate-pulse">0.5%+</div>
              <div className="text-sm text-white/40 uppercase tracking-wider">Min Edge</div>
            </div>
            <div className="group">
              <div className="stat-value text-4xl font-bold text-neon-pink mb-2 group-hover:animate-pulse">50+</div>
              <div className="text-sm text-white/40 uppercase tracking-wider">Sports</div>
            </div>
            <div className="group">
              <div className="stat-value text-4xl font-bold text-neon-purple mb-2 group-hover:animate-pulse">3</div>
              <div className="text-sm text-white/40 uppercase tracking-wider">Alert Channels</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-white">Everything You Need to </span>
              <span className="text-neon-cyan">Trade Smarter</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Professional-grade tools for finding and executing betting edges
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-black border border-white/10 rounded-xl p-6 hover:border-neon-green/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-neon-green/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-neon-green" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Arbitrage Detection</h3>
                <p className="text-white/50">
                  Find guaranteed profit opportunities across sportsbooks with 2-way and 3-way arbitrage detection.
                </p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-black border border-white/10 rounded-xl p-6 hover:border-neon-cyan/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-neon-cyan/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-neon-cyan" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Middle Finder</h3>
                <p className="text-white/50">
                  Detect totals and spread middles where you can win both sides of a bet.
                </p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-pink to-neon-orange rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-black border border-white/10 rounded-xl p-6 hover:border-neon-pink/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-neon-pink/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-neon-pink" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Instant Alerts</h3>
                <p className="text-white/50">
                  Get notified via Discord, Telegram, or Email the moment an opportunity is detected.
                </p>
              </div>
            </div>

            {/* Feature Card 4 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-black border border-white/10 rounded-xl p-6 hover:border-neon-purple/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-neon-purple/10 flex items-center justify-center mb-4">
                  <Wallet className="h-6 w-6 text-neon-purple" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Paper Trading</h3>
                <p className="text-white/50">
                  Practice with a virtual bankroll. Realistic latency and slippage simulation included.
                </p>
              </div>
            </div>

            {/* Feature Card 5 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-yellow to-neon-green rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-black border border-white/10 rounded-xl p-6 hover:border-neon-yellow/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-neon-yellow/10 flex items-center justify-center mb-4">
                  <Radio className="h-6 w-6 text-neon-yellow" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Real-time Scanning</h3>
                <p className="text-white/50">
                  Continuous polling every 10 seconds to catch opportunities before lines move.
                </p>
              </div>
            </div>

            {/* Feature Card 6 */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-black border border-white/10 rounded-xl p-6 hover:border-neon-green/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-neon-green/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-neon-green" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Stake Calculator</h3>
                <p className="text-white/50">
                  Automatic optimal stake sizing to lock in guaranteed profits on every arb.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-4 border-t border-white/5">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="text-white">How It </span>
            <span className="text-neon-purple">Works</span>
          </h2>

          <div className="space-y-12">
            {[
              { num: '01', title: 'Configure Your Preferences', desc: 'Set your minimum edge threshold, choose sports to scan, and connect your notification channel.', color: 'neon-green' },
              { num: '02', title: 'Let the Scanner Work', desc: 'Our worker continuously polls odds from multiple sportsbooks, detecting arbitrage and middle opportunities.', color: 'neon-cyan' },
              { num: '03', title: 'Get Alerted Instantly', desc: 'Receive notifications with full details including legs, odds, and suggested stake amounts.', color: 'neon-pink' },
              { num: '04', title: 'Paper Trade or Go Live', desc: 'Practice with paper trading to track your performance, or place real bets with confidence.', color: 'neon-purple' },
            ].map((step, i) => (
              <div key={i} className="flex gap-8 items-start group">
                <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-${step.color}/10 border border-${step.color}/30 flex items-center justify-center font-mono text-2xl font-bold text-${step.color} group-hover:shadow-lg group-hover:shadow-${step.color}/20 transition-all`}>
                  {step.num}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-white/50 text-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-purple rounded-3xl blur-2xl opacity-20" />
            <div className="relative bg-black/80 border border-white/10 rounded-2xl p-12">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Find Your Edge?</h2>
              <p className="text-white/50 mb-8 text-lg">
                Join now and start scanning for opportunities. No credit card required.
              </p>
              <Button size="lg" asChild className="btn-neon bg-neon-green hover:bg-neon-green/90 text-black font-semibold text-lg px-8 h-14">
                <Link href="/auth/signin">
                  Start Scanning Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-neon-green" />
            <span className="font-semibold">
              <span className="text-neon-green">ODDS</span>
              <span className="text-white/80">TRADER</span>
            </span>
          </div>
          <p className="text-sm text-white/30">
            For educational and research purposes only. Gamble responsibly.
          </p>
        </div>
      </footer>
    </div>
  );
}
