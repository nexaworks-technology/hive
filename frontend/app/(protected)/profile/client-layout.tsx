"use client";
import { Sidebar } from '@/components/sidebar';

export default function ProfileClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab="profile" setActiveTab={() => {}} />
      <div className="flex-1 flex items-center justify-center bg-background">
        {children}
      </div>
    </div>
  );
}
