'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, PlusCircle, BookOpen, Settings } from 'lucide-react';
import { useAddLead } from '@/context/AddLeadContext';

const NAV = [
  { href: '/',          icon: LayoutDashboard, label: 'Home' },
  { href: '/leads/new', icon: Users,           label: 'Leads' },
  { href: '/blogs',     icon: BookOpen,        label: 'Blogs' },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { openModal } = useAddLead();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/leads/new') return pathname.startsWith('/leads');
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">

        {/* First two nav items */}
        {NAV.slice(0, 2).map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
            </Link>
          );
        })}

        {/* Centre FAB — opens modal */}
        <button onClick={openModal} className="flex flex-col items-center -mt-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-300">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-medium text-blue-600 mt-1">Add</span>
        </button>

        {/* Last two nav items */}
        {NAV.slice(2).map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}
