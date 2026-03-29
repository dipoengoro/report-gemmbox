import Link from "next/link";
import { Home, PieChart, Settings, Wallet } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/40 hidden md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="">Gemmbox Web</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <PieChart className="h-4 w-4" />
              Laporan Detail
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Settings className="h-4 w-4" />
              Pengaturan
            </Link>
          </nav>
        </div>
      </div>
    </aside>
  );
}