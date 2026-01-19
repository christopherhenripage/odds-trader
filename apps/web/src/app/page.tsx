import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  ArrowRight,
  Activity,
  Target,
  Sparkles,
  DollarSign,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Calculator,
  BarChart3,
  Clock,
  Percent,
  Scale,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[128px] animate-pulse-slow" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-neon-green/10 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Demo Notice Banner */}
      <div className="relative bg-gradient-to-r from-neon-purple/20 via-neon-cyan/20 to-neon-purple/20 border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-neon-cyan" />
          <span className="text-white/70">
            <span className="text-neon-cyan font-semibold">Demo Mode:</span> This app is running with sample data for demonstration purposes
          </span>
        </div>
      </div>

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
            <Link href="#learn" className="text-white/50 hover:text-white transition-colors hidden sm:block">
              Learn
            </Link>
            <Link href="#dashboard-guide" className="text-white/50 hover:text-white transition-colors hidden sm:block">
              Guide
            </Link>
            <Button asChild className="btn-neon bg-neon-green hover:bg-neon-green/90 text-black font-semibold">
              <Link href="/dashboard">
                View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="container mx-auto text-center max-w-5xl">
          {/* Badges */}
          <div className="flex justify-center gap-3 mb-8">
            <Badge variant="arb" className="badge-arb px-4 py-1.5 text-sm font-mono">ARB</Badge>
            <Badge variant="middle" className="badge-middle px-4 py-1.5 text-sm font-mono">MIDDLE</Badge>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text-neon">Sports Betting</span>
            <br />
            <span className="text-white">Arbitrage Scanner</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Find guaranteed profit opportunities by exploiting price differences across sportsbooks.
            This tool scans odds in real-time and calculates exactly how much to bet on each side.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild className="btn-neon bg-neon-green hover:bg-neon-green/90 text-black font-semibold text-lg px-8 h-14">
              <Link href="/dashboard">
                Explore Dashboard <Sparkles className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/20 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 text-white h-14 px-8">
              <Link href="#learn">
                <BookOpen className="mr-2 h-5 w-5" /> Learn How It Works
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-2xl md:text-3xl font-bold text-neon-green font-mono">50+</div>
              <div className="text-xs text-white/40 uppercase">Opportunities</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-2xl md:text-3xl font-bold text-neon-cyan font-mono">6</div>
              <div className="text-xs text-white/40 uppercase">Sportsbooks</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-2xl md:text-3xl font-bold text-neon-purple font-mono">5</div>
              <div className="text-xs text-white/40 uppercase">Sports</div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Arbitrage Section */}
      <section id="learn" className="relative py-16 md:py-24 px-4 border-t border-white/5">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <Badge variant="arb" className="mb-4">ARB</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-white">What is </span>
              <span className="text-neon-green">Arbitrage Betting?</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Arbitrage (or &quot;arbing&quot;) is when you bet on ALL outcomes of an event at different sportsbooks,
              locking in a guaranteed profit regardless of who wins.
            </p>
          </div>

          {/* Arbitrage Example */}
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-20" />
            <div className="relative bg-black border border-white/10 rounded-xl overflow-hidden">
              <div className="bg-white/5 border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-neon-green" />
                  <span className="font-semibold text-white">Example: Lakers vs Celtics</span>
                  <Badge variant="arb" className="ml-auto">+2.3% ARB</Badge>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-white/60">
                  Different sportsbooks have different odds. When the math works out, you can bet both sides and profit:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-neon-green/5 border border-neon-green/20 rounded-lg p-4">
                    <div className="text-sm text-white/40 mb-1">DraftKings</div>
                    <div className="text-lg font-semibold text-white mb-2">Lakers to Win</div>
                    <div className="flex items-center justify-between">
                      <span className="text-neon-green font-mono text-xl">+110</span>
                      <span className="text-white/60">Bet: <span className="text-white font-mono">$47.62</span></span>
                    </div>
                  </div>
                  <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg p-4">
                    <div className="text-sm text-white/40 mb-1">FanDuel</div>
                    <div className="text-lg font-semibold text-white mb-2">Celtics to Win</div>
                    <div className="flex items-center justify-between">
                      <span className="text-neon-cyan font-mono text-xl">+105</span>
                      <span className="text-white/60">Bet: <span className="text-white font-mono">$52.38</span></span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-5 w-5 text-neon-purple" />
                    <span className="font-semibold text-white">The Math</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-white/60">
                      <span>Total Wagered:</span>
                      <span className="text-white font-mono">$100.00</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>If Lakers Win (payout):</span>
                      <span className="text-white font-mono">$102.30</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>If Celtics Win (payout):</span>
                      <span className="text-white font-mono">$102.30</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="text-neon-green font-semibold">Guaranteed Profit:</span>
                      <span className="text-neon-green font-mono font-bold">+$2.30 (2.3%)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm text-white/50">
                  <CheckCircle2 className="h-5 w-5 text-neon-green flex-shrink-0 mt-0.5" />
                  <span>No matter who wins the game, you make $2.30 profit on your $100 investment. This is risk-free profit.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What are Middles Section */}
      <section className="relative py-16 md:py-24 px-4 border-t border-white/5">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <Badge variant="middle" className="mb-4">MIDDLE</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-white">What is a </span>
              <span className="text-neon-cyan">Middle Bet?</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              A middle is when you bet on both sides of a spread or total, creating a &quot;window&quot;
              where you could win BOTH bets if the final score lands in the middle.
            </p>
          </div>

          {/* Middle Example */}
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl blur opacity-20" />
            <div className="relative bg-black border border-white/10 rounded-xl overflow-hidden">
              <div className="bg-white/5 border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-neon-cyan" />
                  <span className="font-semibold text-white">Example: Chiefs vs Bills (Spread)</span>
                  <Badge variant="middle" className="ml-auto">3.5pt MIDDLE</Badge>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-white/60">
                  When different books have different point spreads, you can bet both sides and create a winning window:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg p-4">
                    <div className="text-sm text-white/40 mb-1">BetMGM</div>
                    <div className="text-lg font-semibold text-white mb-2">Chiefs -3.5</div>
                    <div className="flex items-center justify-between">
                      <span className="text-neon-cyan font-mono text-xl">-110</span>
                      <span className="text-white/60">Bet: <span className="text-white font-mono">$50</span></span>
                    </div>
                  </div>
                  <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-lg p-4">
                    <div className="text-sm text-white/40 mb-1">Caesars</div>
                    <div className="text-lg font-semibold text-white mb-2">Bills +7</div>
                    <div className="flex items-center justify-between">
                      <span className="text-neon-purple font-mono text-xl">-110</span>
                      <span className="text-white/60">Bet: <span className="text-white font-mono">$50</span></span>
                    </div>
                  </div>
                </div>

                {/* Visual Middle Diagram */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="h-5 w-5 text-neon-yellow" />
                    <span className="font-semibold text-white">The Middle Window</span>
                  </div>
                  <div className="relative h-16 bg-black rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full h-2 bg-white/10 relative">
                        {/* Markers */}
                        <div className="absolute left-[30%] -top-6 text-center transform -translate-x-1/2">
                          <div className="text-xs text-neon-cyan font-mono">-3.5</div>
                        </div>
                        <div className="absolute left-[70%] -top-6 text-center transform -translate-x-1/2">
                          <div className="text-xs text-neon-purple font-mono">+7</div>
                        </div>
                        {/* Middle zone */}
                        <div className="absolute left-[30%] right-[30%] h-full bg-neon-green/50 rounded"></div>
                        {/* Labels */}
                        <div className="absolute left-[50%] top-4 transform -translate-x-1/2">
                          <div className="text-xs text-neon-green font-semibold">WIN BOTH</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mt-4">
                    If Chiefs win by 4, 5, or 6 points, you win BOTH bets. Otherwise, you win one and lose one (small loss due to vig).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-neon-green flex-shrink-0 mt-0.5" />
                    <span className="text-white/60">Chiefs win by 4-6: <span className="text-neon-green">Win Both!</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-neon-yellow flex-shrink-0 mt-0.5" />
                    <span className="text-white/60">Other result: <span className="text-neon-yellow">Small loss (~$5)</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Guide Section */}
      <section id="dashboard-guide" className="relative py-16 md:py-24 px-4 border-t border-white/5">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-white">Understanding the </span>
              <span className="text-neon-purple">Dashboard</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Here&apos;s what each column and metric means when you explore the opportunities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Type */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                  <Badge variant="arb" className="text-xs">ARB</Badge>
                </div>
                <h3 className="font-semibold text-white">Type</h3>
              </div>
              <p className="text-white/50 text-sm">
                <span className="text-neon-green">ARB</span> = Guaranteed profit arbitrage.
                <span className="text-neon-cyan"> MIDDLE</span> = Chance to win both sides with a gap in the spread/total.
              </p>
            </div>

            {/* Edge % */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-neon-green" />
                </div>
                <h3 className="font-semibold text-white">Edge %</h3>
              </div>
              <p className="text-white/50 text-sm">
                Your profit percentage on the total amount wagered. A 2.3% edge on $100 = $2.30 guaranteed profit.
              </p>
            </div>

            {/* Width */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-neon-cyan" />
                </div>
                <h3 className="font-semibold text-white">Width (Middles Only)</h3>
              </div>
              <p className="text-white/50 text-sm">
                The size of the &quot;middle window&quot; in points. A 3.5pt width means you have a 3.5 point range to win both bets.
              </p>
            </div>

            {/* Market */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-neon-purple" />
                </div>
                <h3 className="font-semibold text-white">Market</h3>
              </div>
              <p className="text-white/50 text-sm">
                <span className="text-white">Moneyline</span> = Who wins.
                <span className="text-white"> Spreads</span> = Point handicap.
                <span className="text-white"> Totals</span> = Over/under points.
              </p>
            </div>

            {/* Stakes */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neon-yellow/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-neon-yellow" />
                </div>
                <h3 className="font-semibold text-white">Stakes</h3>
              </div>
              <p className="text-white/50 text-sm">
                Click any opportunity to see the exact dollar amounts to bet on each side. Stakes are calculated for a $100 total wager.
              </p>
            </div>

            {/* Time */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neon-pink/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-neon-pink" />
                </div>
                <h3 className="font-semibold text-white">Game Time</h3>
              </div>
              <p className="text-white/50 text-sm">
                When the game starts. Opportunities can disappear quickly as odds adjust, so timing matters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 md:py-24 px-4 border-t border-white/5">
        <div className="container mx-auto text-center max-w-2xl">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-purple rounded-3xl blur-2xl opacity-20" />
            <div className="relative bg-black/80 border border-white/10 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Explore?</h2>
              <p className="text-white/50 mb-8 text-lg">
                Check out the live dashboard to see real opportunities with calculated stakes and edges.
              </p>
              <Button size="lg" asChild className="btn-neon bg-neon-green hover:bg-neon-green/90 text-black font-semibold text-lg px-8 h-14">
                <Link href="/dashboard">
                  View Live Dashboard <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-xs text-white/30 mt-6">
                No account required. Dashboard updates every 15 seconds.
              </p>
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
          <p className="text-sm text-white/30 text-center">
            Demo project for educational purposes. Always gamble responsibly.
          </p>
        </div>
      </footer>
    </div>
  );
}
