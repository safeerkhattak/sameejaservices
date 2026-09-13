"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, FilePlus2, LayoutDashboard, LogOut, ReceiptText, Search, UsersRound } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WebMcpTools } from "@/components/webmcp-tools";

type ShellUser = { displayName: string; email: string; role: "owner" | "staff" };

const items = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "New invoice", href: "/invoices/new", icon: FilePlus2 },
  { label: "Payments", href: "/payments", icon: Banknote, ownerOnly: true },
  { label: "Team", href: "/team", icon: UsersRound, ownerOnly: true },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const initials = user.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const activeHref = pathname === "/"
    ? "/"
    : pathname === "/invoices/new"
      ? "/invoices/new"
      : pathname.startsWith("/invoices")
        ? "/invoices"
        : pathname.startsWith("/payments")
          ? "/payments"
          : pathname.startsWith("/team")
            ? "/team"
            : "";

  return (
    <SidebarProvider style={{ "--sidebar-width": "15.25rem" } as React.CSSProperties}>
      <Sidebar className="border-0 bg-[#102a43]" collapsible="offcanvas">
        <SidebarHeader className="px-5 pb-3 pt-6">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b942]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5b942] text-sm font-black text-[#102a43] shadow-[0_8px_24px_rgba(245,185,66,.2)]">SC</span>
            <span><span className="block text-[15px] font-bold leading-tight">Sameeja</span><span className="block text-xs text-slate-300">Commission Services</span></span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-3 pt-5">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {items.filter((item) => !item.ownerOnly || user.role === "owner").map((item) => {
                  const active = item.href === activeHref;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} size="lg" className="h-11 rounded-xl px-3 text-slate-300 hover:bg-white/8 hover:text-white data-[active=true]:bg-white/12 data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:shadow-[inset_3px_0_0_#f5b942]">
                        <Link href={item.href}><item.icon className="h-[18px] w-[18px]" /><span>{item.label}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">{initials || "SC"}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{user.displayName}</span><span className="block text-xs capitalize text-slate-400">{user.role}</span></span>
            </div>
            <form action="/auth/signout" method="post" className="mt-3 border-t border-white/10 pt-3"><button type="submit" className="flex w-full items-center gap-2 text-xs font-medium text-slate-300 hover:text-white"><LogOut className="h-3.5 w-3.5" />Sign out</button></form>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f3f6f8]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="h-9 w-9 rounded-xl border border-slate-200 text-[#102a43] md:hidden" />
            <form action="/invoices" method="get" className="relative hidden w-[min(34vw,390px)] lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="q" aria-label="Search invoices" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#2b7a78] focus:bg-white focus:ring-4 focus:ring-[#2b7a78]/10" placeholder="Search invoice or store" />
            </form>
            <span className="truncate text-sm font-bold text-[#102a43] lg:hidden">Sameeja Ledger</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block"><span className="block text-sm font-semibold">{user.displayName}</span><span className="block text-xs capitalize text-slate-500">{user.role === "owner" ? "Full access" : "Invoice creator"}</span></span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5eef4] text-sm font-bold text-[#102a43]">{initials || "SC"}</span>
          </div>
        </header>
        {children}
      </SidebarInset>
      <Toaster richColors position="top-right" />
      <WebMcpTools />
    </SidebarProvider>
  );
}
