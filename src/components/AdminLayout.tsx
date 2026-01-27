"use client";

import { AdminNav } from "./AdminNav";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 bg-[#1a0a2e]">{children}</main>
    </div>
  );
}
