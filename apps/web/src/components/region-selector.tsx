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
  us: { label: 'United States', flag: '🇺🇸', bookmakers: 'DraftKings, FanDuel, BetMGM, Caesars', apiRegion: 'us' },
  au: { label: 'Australia', flag: '🇦🇺', bookmakers: 'TAB, Sportsbet, Ladbrokes, Neds, PointsBet', apiRegion: 'au' },
  nz: { label: 'New Zealand', flag: '🇳🇿', bookmakers: 'TAB NZ, Sportsbet, Ladbrokes (via AU books)', apiRegion: 'au' },
  uk: { label: 'United Kingdom', flag: '🇬🇧', bookmakers: 'Bet365, William Hill, Paddy Power, Sky Bet', apiRegion: 'uk' },
  eu: { label: 'Europe', flag: '🇪🇺', bookmakers: 'Pinnacle, Unibet, 888sport, Betsson', apiRegion: 'eu' },
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

export function getApiRegion(region: RegionCode): string {
  return REGIONS[region].apiRegion;
}

// NZ-specific information for users
export const NZ_NOTICE = {
  title: 'New Zealand Users',
  description: 'We use Australian bookmaker odds since many AU bookmakers (TAB, Sportsbet, Ladbrokes) also operate in NZ. Sports include NRL, Super Rugby, NBA, and Premier League.',
  bookmakers: [
    { name: 'TAB NZ', url: 'https://www.tab.co.nz', note: 'Official NZ betting operator' },
    { name: 'Sportsbet', url: 'https://www.sportsbet.com.au', note: 'Available via AU' },
    { name: 'Ladbrokes', url: 'https://www.ladbrokes.com.au', note: 'Available via AU' },
  ],
};
