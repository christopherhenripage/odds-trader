'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Gift,
  DollarSign,
  ExternalLink,
  Play,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { markPromoStarted } from '@/lib/actions/promos';
import { cn } from '@/lib/utils';

interface Promo {
  id: string;
  bookmaker: string;
  bookmakerName: string;
  title: string;
  description: string | null;
  type: string;
  minDeposit: number | null;
  maxBonus: number | null;
  estimatedValue: number | null;
  minOdds: number | null;
  termsUrl: string | null;
  featured: boolean;
}

interface PromoCardProps {
  promo: Promo;
  isStarted?: boolean;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  SIGN_UP_BONUS: { label: 'Sign Up', color: 'bg-neon-green/20 text-neon-green border-neon-green/30' },
  DEPOSIT_MATCH: { label: 'Deposit Match', color: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30' },
  FREE_BET: { label: 'Free Bet', color: 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' },
  ODDS_BOOST: { label: 'Odds Boost', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  MONEY_BACK: { label: 'Money Back', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  MULTI_BOOST: { label: 'Multi Boost', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  RELOAD_BONUS: { label: 'Reload', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  OTHER: { label: 'Other', color: 'bg-white/20 text-white/70 border-white/30' },
};

const bookmakerLogos: Record<string, string> = {
  sportsbet: '🟠',
  ladbrokes: '🔴',
  neds: '🟡',
  pointsbet: '🟢',
  tab: '🔵',
  bet365: '🟢',
  unibet: '🟣',
  bluebet: '🔵',
};

export function PromoCard({ promo, isStarted = false }: PromoCardProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [started, setStarted] = useState(isStarted);

  const typeInfo = typeLabels[promo.type] || typeLabels.OTHER;

  const handleStart = async () => {
    setLoading(true);
    const result = await markPromoStarted(promo.id);
    if (result.success) {
      setStarted(true);
    }
    setLoading(false);
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      promo.featured
        ? "bg-gradient-to-br from-black/80 via-black/60 to-neon-green/5 border-neon-green/30"
        : "bg-black/50 border-white/10 hover:border-white/20"
    )}>
      {promo.featured && (
        <div className="absolute top-0 right-0 px-2 py-1 bg-neon-green/20 text-neon-green text-xs font-medium flex items-center gap-1 rounded-bl-lg border-l border-b border-neon-green/30">
          <Sparkles className="h-3 w-3" />
          Featured
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Bookmaker Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-2xl">
            {bookmakerLogos[promo.bookmaker] || '📚'}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{promo.bookmakerName}</span>
              <Badge variant="outline" className={cn("text-xs", typeInfo.color)}>
                {typeInfo.label}
              </Badge>
            </div>

            <h3 className="text-lg font-bold text-white mt-1">{promo.title}</h3>

            {/* Key Details */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
              {promo.estimatedValue && (
                <div className="flex items-center gap-1 text-neon-green">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-mono font-bold">${promo.estimatedValue}</span>
                  <span className="text-white/40">EV</span>
                </div>
              )}
              {promo.maxBonus && (
                <div className="text-white/50">
                  Up to <span className="text-white font-medium">${promo.maxBonus}</span>
                </div>
              )}
              {promo.minDeposit && (
                <div className="text-white/50">
                  Min <span className="text-white/70">${promo.minDeposit}</span> deposit
                </div>
              )}
              {promo.minOdds && (
                <div className="text-white/50">
                  Min odds <span className="text-white/70">{promo.minOdds.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Expandable Description */}
            {promo.description && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 mt-2 transition-colors"
              >
                <Info className="h-3 w-3" />
                {expanded ? 'Hide details' : 'Show details'}
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}

            {expanded && promo.description && (
              <p className="text-sm text-white/60 mt-2 p-2 bg-white/5 rounded-lg">
                {promo.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {started ? (
              <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
                In Progress
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={loading}
                className="bg-neon-green hover:bg-neon-green/90 text-black font-medium"
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {promo.termsUrl && (
              <a
                href={promo.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
              >
                Terms <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
