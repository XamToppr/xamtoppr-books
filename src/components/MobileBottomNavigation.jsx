import { BookOpen, ClipboardCheck, House, PlayCircle, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navigationItems = [
  { label: 'Home', to: '/', icon: House, isActive: ({ pathname, hash }) => pathname === '/' && !hash },
  { label: 'Video Course', to: '/video-courses', icon: PlayCircle, isActive: ({ pathname }) => pathname.startsWith('/video-courses') },
  { label: 'Study Notes', to: '/#study-notes', icon: BookOpen, isActive: ({ pathname, hash }) => pathname === '/' && hash === '#study-notes' },
  { label: 'Mock Test', to: '/test-series', icon: ClipboardCheck, isActive: ({ pathname }) => pathname === '/test-series' || pathname === '/mock-tests' },
  { label: 'Profile', to: '/my-library', icon: UserRound, isActive: ({ pathname }) => pathname === '/my-library' }
];

export default function MobileBottomNavigation() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash === '#study-notes') {
      document.getElementById('study-notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash, pathname]);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {navigationItems.map(({ label, to, icon: Icon, isActive }) => {
          const active = isActive({ pathname, hash });
          return (
            <Link
              key={label}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center transition-colors ${
                active ? 'text-blue-950' : 'text-slate-500 hover:text-blue-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-blue-800' : ''}`} aria-hidden="true" />
              <span className={`text-[10px] leading-tight ${active ? 'font-extrabold' : 'font-semibold'}`}>
                {label}
              </span>
              {active && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-amber-400" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
