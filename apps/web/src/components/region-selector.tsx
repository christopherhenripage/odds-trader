'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

export const REGIONS = {
  us: { label: 'United States', flag: '🇺🇸', bookmakers: 'DraftKings, FanDuel, BetMGM, Caesars' },
  au: { label: 'Australia', flag: '🇦🇺', bookmakers: 'TAB, Sportsbet, Ladbrokes, Neds, PointsBet' },
  uk: { label: 'United Kingdom', flag: '🇬🇧', bookmakers: 'Bet365, William Hill, Paddy Power, Sky Bet' },
  eu: { label: 'Europe', flag: '🇪🇺', bookmakers: 'Pinnacle, Unibet, 888sport, Betsson' },
} as const;

export type RegionCode = keyof typeof REGIONS;

interface RegionSelectorProps {
  onRegionChange?: (region: RegionCode) => void;
}

export function RegionSelector({ onRegionChange }: RegionSelectorProps) {
  const [region, setRegion] = useState<RegionCode>('us');

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('odds-trader-region') as RegionCode;
    if (saved && REGIONS[saved]) {
      setRegion(saved);
    }
  }, []);

  const handleChange = (value: RegionCode) => {
    setRegion(value);
    localStorage.setItem('odds-trader-region', value);
    onRegionChange?.(value);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={region} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{REGIONS[region].flag}</span>
              <span>{REGIONS[region].label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(REGIONS).map(([code, { label, flag, bookmakers }]) => (
            <SelectItem key={code} value={code}>
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span>{flag}</span>
                  <span>{label}</span>
                </span>
                <span className="text-xs text-muted-foreground">{bookmakers}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function getStoredRegion(): RegionCode {
  if (typeof window === 'undefined') return 'us';
  const saved = localStorage.getItem('odds-trader-region') as RegionCode;
  return saved && REGIONS[saved] ? saved : 'us';
}
