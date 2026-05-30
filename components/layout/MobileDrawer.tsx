'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, UserPlus, AlertCircle, CalendarCheck,
  UserCheck, Clock, CheckCircle, XCircle, Settings, X, Zap,
} from 'lucide-react';
import { useAuthUser } from '@/lib/useAuthUser';

const LEAD_NAV = [
  { href: '/leads/new',       label: 'New Leads',         icon: UserPlus,      key: 'new',       dot: '#3b82f6' },
  { href: '/leads/overdue',   label: 'Overdue',            icon: AlertCircle,   key: 'overdue',   dot: '#ef4444' },
  { href: '/leads/today',     label: "Today's Follow-up",  icon: CalendarCheck, key: 'today',     dot: '#14b8a6' },
  { href: '/leads/followup',  label: 'Pending Follow-up',  icon: UserCheck,     key: 'followup',  dot: '#f59e0b' },
  { href: '/leads/inprocess', label: 'In Process',         icon: Clock,         key: 'inprocess', dot: '#06b6d4' },
  { href: '/leads/converted', label: 'Converted',          icon: CheckCircle,   key: 'converted', dot: '#10b981' },
  { href: '/leads/dead',      label: 'Dead Leads',         icon: XCircle,       key: 'dead',      dot: '#9ca3af' },
];

export default function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const user = useAuthUser();
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (!open) return null;

  const NavLink = ({ href, label, icon: Icon, badge, dot }: {
    href: string; label: string; icon: React.ElementType; badge?: number; dot?: string;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        {dot && !active
          ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
          : <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
        }
        <span className="flex-1 truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col border-r border-gray-100">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Make My Documents</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">CRM</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <NavLink href="/" label="Dashboard" icon={LayoutDashboard} />

          <div className="pt-4 pb-1.5 px-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pipeline</p>
          </div>
          {LEAD_NAV.map(({ href, label, icon, dot }) => (
            <NavLink key={href} href={href} label={label} icon={icon} dot={dot} />
          ))}

          <div className="pt-4 pb-1.5 px-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin</p>
          </div>
          <NavLink href="/settings" label="Settings" icon={Settings} />
          {/* <NavLink href="/blogs" label="Blogs" icon={BookOpen} /> */}
        </div>

        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
