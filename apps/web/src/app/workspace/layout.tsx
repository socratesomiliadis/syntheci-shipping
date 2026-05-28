import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceSidebar } from "../../components/workspace-sidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <WorkspaceSidebar />
        <SidebarInset className="bg-white">
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b border-slate-200/50 bg-white/90 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950">
                Operations workspace
              </div>
              <div className="truncate text-xs text-slate-500">
                RAG, evidence trails, and maritime automation
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
