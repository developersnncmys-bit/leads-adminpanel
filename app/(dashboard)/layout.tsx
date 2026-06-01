'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import MobileDrawer from '@/components/layout/MobileDrawer';
import AddLeadModal from '@/components/leads/AddLeadModal';
import { AddLeadProvider } from '@/context/AddLeadContext';
import AddBlogModal from '@/components/blogs/AddBlogModal';
import { AddBlogProvider } from '@/context/AddBlogContext';
import EditBlogModal from '@/components/blogs/EditBlogModal';
import { EditBlogProvider } from '@/context/EditBlogContext';
import { BlogProvider } from '@/context/BlogContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AddLeadProvider>
      <BlogProvider>
      <AddBlogProvider>
        <EditBlogProvider>
          <div className="h-full flex bg-slate-50/80">
            <Sidebar />
            <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            <div className="flex-1 flex flex-col lg:ml-56 min-h-screen">
              <Header onMenuToggle={() => setDrawerOpen(true)} />
              <main className="flex-1 p-5 lg:p-6 pb-24 lg:pb-8 animate-fade-in overflow-x-hidden">
                {children}
              </main>
            </div>

            <BottomNav />
            <AddLeadModal />
            <AddBlogModal />
            <EditBlogModal />
          </div>
        </EditBlogProvider>
      </AddBlogProvider>
      </BlogProvider>
    </AddLeadProvider>
  );
}
