'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Activity,
  LayoutDashboard,
  Bell,
  Wallet,
  Settings,
  LogOut,
  User,
  Shield,
} from 'lucide-react';

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: Wallet },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative">
              <Activity className="h-7 w-7 text-neon-green" />
              <div className="absolute inset-0 blur-md bg-neon-green/40" />
            </div>
            <span className="font-bold tracking-tight hidden sm:inline-block">
              <span className="text-neon-green">ODDS</span>
              <span className="text-white/80">TRADER</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline-block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 hover:bg-white/5 border border-transparent hover:border-white/10">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="h-7 w-7 rounded-full ring-2 ring-neon-green/30"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-neon-purple/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-neon-purple" />
                </div>
              )}
              <span className="hidden sm:inline-block text-white/80">{user.name || user.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-black/95 border-white/10 backdrop-blur-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/40">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem asChild className="focus:bg-white/5 focus:text-white">
              <Link href="/settings/notifications">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/' })}
              className="focus:bg-red-500/10 focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
