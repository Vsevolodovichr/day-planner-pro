import { ReactNode } from "react";
import { TopToolbar } from "./TopToolbar";

const appBackground = {
  backgroundColor: "#050607",
  backgroundImage: "var(--pwa-bg-image)",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
};

export function AppShell({ children, showToolbar = true }: { children: ReactNode; showToolbar?: boolean; showStatusBar?: boolean }) {
  return (
    <div className="min-h-screen w-full flex justify-center" style={appBackground}>
      <div className="relative w-full sm:w-[428px] sm:min-h-[926px] bg-appBg flex flex-col" style={{ ...appBackground, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {showToolbar && <TopToolbar />}
        <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>
      </div>
    </div>
  );
}
