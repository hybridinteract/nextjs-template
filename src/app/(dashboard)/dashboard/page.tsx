import { LayoutDashboard } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your application dashboard.
        </p>
      </div>

      {/* Replace this placeholder with your actual dashboard content */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-20 gap-3 text-center">
        <LayoutDashboard className="size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          Your dashboard content goes here.
          <br />
          Run <code className="font-mono bg-muted px-1 rounded">node ncube.js startdomain &lt;Name&gt;</code> to scaffold a feature.
        </p>
      </div>
    </div>
  );
}
