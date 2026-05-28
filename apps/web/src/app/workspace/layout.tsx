import Link from "next/link";
import { Anchor, Bell, Database, FileText, MessageSquare, Radar } from "lucide-react";

const navItems = [
  { href: "/workspace", label: "Overview", icon: Radar },
  { href: "/workspace/sources", label: "Sources", icon: Database },
  { href: "/workspace/chat", label: "Chat", icon: MessageSquare },
  { href: "/workspace/automations", label: "Automations", icon: Bell },
  { href: "/workspace/runs", label: "Runs", icon: FileText },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
            <Anchor className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">Syntheci</div>
            <div className="text-xs text-slate-500">Maritime AI</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div>
            <div className="text-sm font-semibold text-slate-950">Operations workspace</div>
            <div className="text-xs text-slate-500">RAG, evidence trails, and maritime automation</div>
          </div>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-950">
            Login
          </Link>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
