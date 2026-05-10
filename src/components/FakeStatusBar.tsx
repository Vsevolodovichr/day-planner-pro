export function FakeStatusBar() {
  return (
    <div className="bg-topBar text-textMain" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex justify-between items-center px-5 pt-3 pb-2 text-[14px]">
        <span className="opacity-90">◀ App Store</span>
        <span></span>
      </div>
      <div className="flex justify-between items-center px-6 pb-2">
        <span className="text-[17px] font-semibold tracking-tight">06:50</span>
        <div className="flex items-center gap-1.5 text-[13px]">
          <span>•••</span>
          <span>📶</span>
          <span className="border border-white/60 rounded-[3px] px-1 text-[10px] leading-[12px]">66</span>
        </div>
      </div>
    </div>
  );
}
