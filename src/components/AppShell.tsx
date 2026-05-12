import { ReactNode, useEffect } from 'react';
import { TopToolbar } from './TopToolbar';

export function AppShell({
  children,
  showToolbar = true,
}: {
  children: ReactNode;
  showToolbar?: boolean;
  showStatusBar?: boolean;
}) {
  useEffect(() => {
    const color = localStorage.getItem('mz_accent_color');
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-strong', color);
    document.documentElement.style.setProperty('--accent-dark', color);
    document.documentElement.style.setProperty('--date-panel-active', color);
  }, []);

  return (
    <div className="min-h-full w-full flex justify-center bg-transparent">
      <div
        className="fornastya-phone relative w-full min-h-[100dvh] flex flex-col lg:max-w-7xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {showToolbar && <TopToolbar />}
        <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>
      </div>
    </div>
  );
}
