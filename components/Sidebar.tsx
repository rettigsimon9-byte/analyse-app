'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BarChart2, FileText, Target, Briefcase, Newspaper, LineChart, LogOut, TrendingUp, Star } from 'lucide-react';

const NAV = [
  { href: '/',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/analysen',       label: 'Analysen',        icon: BarChart2 },
  { href: '/sonderberichte', label: 'Sonderberichte',  icon: Star },
  { href: '/zielzonen',      label: 'Zielzonen',       icon: Target },
  { href: '/portfolio',      label: 'Portfolio',       icon: Briefcase },
  { href: '/news',           label: 'News',            icon: Newspaper },
  { href: '/charts',         label: 'Charts',          icon: LineChart },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  return (
    <aside className="w-60 min-h-screen bg-[#0f0e2e] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <TrendingUp size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Analysen</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors">
          <LogOut size={17} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
