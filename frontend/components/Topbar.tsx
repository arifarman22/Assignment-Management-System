"use client";
import { useAuth } from "@/lib/auth-context";
import { Bell, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { auth } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-30"
      style={{ boxShadow: "0 1px 0 #E2E8F0" }}>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm w-52">
          <Search size={14} />
          <span className="text-slate-400">Search…</span>
          <kbd className="ml-auto text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <Bell size={15} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>

        {/* User */}
        {auth && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <Avatar name={auth.name} size="sm" />
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-slate-800 leading-none mb-0.5">{auth.name}</p>
              <RoleBadge role={auth.role} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
