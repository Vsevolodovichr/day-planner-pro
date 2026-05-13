import { ReactNode, useEffect } from 'react';
import { BottomNav } from './BottomNav';
import { applyAccent, loadAccent } from '../lib/theme';

export function AppShell({
  children,
  showToolbar = true,
}: {
  children: ReactNode;
  showToolbar?: boolean;
  showStatusBar?: boolean;
}) {
  useEffect(() => {
    applyAccent(loadAccent());
  }, []);

  return (
    <div className="app-shell-root min-h-full w-full flex justify-center bg-transparent">
      <div
        className={`fornastya-phone app-shell-frame relative w-full min-h-dvh flex flex-col ${
          showToolbar ? 'has-toolbar' : 'no-toolbar'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <main
          className="app-shell-main flex-1 overflow-y-auto no-scrollbar"
          style={{
            paddingBottom: showToolbar
              ? `var(--app-shell-main-bottom, calc(96px + env(safe-area-inset-bottom)))`
              : `env(safe-area-inset-bottom)`,
          }}
        >
          {children}
        </main>
        {showToolbar && <BottomNav />}
      </div>
    </div>
  );
}
