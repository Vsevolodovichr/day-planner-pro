import { ReactNode } from "react";
import { FakeStatusBar } from "./FakeStatusBar";
import { TopToolbar } from "./TopToolbar";

export function AppShell({ children, showToolbar = true, showStatusBar = true }: { children: ReactNode; showToolbar?: boolean; showStatusBar?: boolean }) {
  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#050607" }}>
      <div className="relative w-full sm:w-[428px] sm:min-h-[926px] bg-appBg flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {showStatusBar && <FakeStatusBar />}
        {showToolbar && <TopToolbar />}
        <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>
      </div>
    </div>
  );
}
