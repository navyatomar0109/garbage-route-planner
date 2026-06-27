import React from "react";
import { AppSidebar } from "./sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 shrink-0">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-4 text-sm font-mono text-muted-foreground">
              <span>SYSTEM: ONLINE</span>
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </header>
          <div className="p-6 flex-1 max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
