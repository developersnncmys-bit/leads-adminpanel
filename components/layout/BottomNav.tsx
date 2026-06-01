'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, PlusCircle, Clock, UserCheck } from 'lucide-react';
import { useAddLead } from '@/context/AddLeadContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { openModal } = useAddLead();

  // Exact-match active state so each pipeline icon only highlights when the
  // user is on its specific list page.
  const isActive = (href: string) => pathname === href;

  const leftNav = [
    { href: '/',          icon: LayoutDashboard, label: 'Home' },
    { href: '/leads/new', icon: Users,           label: 'Leads' },
  ];

  const rightNav = [
    { href: '/leads/inprocess', icon: Clock,     label: 'In Process' },
    { href: '/leads/followup',  icon: UserCheck, label: 'Follow Up' },
  ];

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`flex flex-col items-center gap-1 px-1.5 py-1 rounded-xl transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">

        {/* Left: Home + Leads */}
        {leftNav.map((item) => <NavItem key={item.href} {...item} />)}

        {/* Centre FAB — Add Lead */}
        <button onClick={openModal} className="flex flex-col items-center -mt-6 flex-shrink-0">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-300">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-medium text-blue-600 mt-1">Add</span>
        </button>

        {/* Right: In Process + Follow Up */}
        {rightNav.map((item) => <NavItem key={item.href} {...item} />)}

      </div>
    </nav>
  );
}
