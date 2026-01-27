"use client";

import { DashboardNav } from "./DashboardNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <DashboardNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
