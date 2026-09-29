type P = { size?: number; color?: string; stroke?: number };

const Svg = ({ size = 24, color = 'currentColor', stroke = 1.75, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Check = (p: P) => <Svg size={18} stroke={2.25} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const ChevronLeft = (p: P) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const ChevronRight = (p: P) => <Svg size={20} {...p}><path d="M9 5l7 7-7 7" /></Svg>;
export const Plus = (p: P) => <Svg size={20} stroke={2.25} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const Trash = (p: P) => <Svg size={22} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Svg>;
export const Camera = (p: P) => <Svg size={22} {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>;
export const Receipt = (p: P) => <Svg {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></Svg>;
export const Image = (p: P) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="M20.5 16l-5-5-8.5 8.5" /></Svg>;
export const TabTasks = (p: P) => <Svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M8 12.5l3 3 5-6" /></Svg>;
export const TabList = (p: P) => <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></Svg>;
export const TabSummary = (p: P) => <Svg {...p}><path d="M3 20h18M6 20v-8M11 20V5M16 20v-5M21 20V9" /></Svg>;
export const TabWorkers = (p: P) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2" /></Svg>;
