'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, PlusCircle, Settings, Bell } from 'lucide-react';
import { useAddLead } from '@/context/AddLeadContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { openModal, leads } = useAddLead();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/leads/new') return pathname.startsWith('/leads');
    return pathname.startsWith(href);
  };

  const notifCount = leads.filter((l) => l.status === 'overdue' || l.status === 'today').length;

  const leftNav = [
    { href: '/',          icon: LayoutDashboard, label: 'Home' },
    { href: '/leads/new', icon: Users,           label: 'Leads' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">

        {/* Left: Home + Leads */}
        {leftNav.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Centre FAB */}
        <button onClick={openModal} className="flex flex-col items-center -mt-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-300">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-medium text-blue-600 mt-1">Add</span>
        </button>

        {/* Settings */}
        <Link href="/settings" className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${isActive('/settings') ? 'text-blue-600' : 'text-gray-400'}`}>
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </Link>

        {/* Bell with badge */}
        <Link href="/leads/overdue" className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${pathname.startsWith('/leads/overdue') ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className="relative">
            <Bell className="w-5 h-5" />
            {notifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center border border-white">
                <span className="text-[9px] font-bold text-white leading-none px-0.5">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Alerts</span>
        </Link>

      </div>
    </nav>
  );
}
