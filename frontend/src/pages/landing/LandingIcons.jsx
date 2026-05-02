const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ic = ({ size = 18, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>{children}</svg>
);

export const IcChat    = (p) => <Ic {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" /></Ic>;
export const IcCard    = (p) => <Ic {...p}><rect x="3" y="6" width="14" height="14" rx="2" /><path d="M7 3h14v14" /></Ic>;
export const IcSummary = (p) => <Ic {...p}><path d="M5 4h14v16H5z" /><path d="M9 9h8M9 13h8M9 17h5" /></Ic>;
export const IcNotes   = (p) => <Ic {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16M7 9h2M7 13h2M15 9h2M15 13h2" /></Ic>;
export const IcStreak  = (p) => <Ic {...p}><path d="M12 3c1.5 3 4 4 4 7a4 4 0 1 1-8 0c0-1.6.7-2.6 1.6-3.4C10.6 5.5 11.5 4.5 12 3z" /><path d="M9.5 14a2.5 2.5 0 0 0 5 0" /></Ic>;
export const IcTimer   = (p) => <Ic {...p}><circle cx="12" cy="13" r="7" /><path d="M12 9v4l2 2M9 3h6" /></Ic>;
export const IcMic     = (p) => <Ic {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 12a7 7 0 0 0 14 0M12 19v3" /></Ic>;
export const IcSearch  = (p) => <Ic {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></Ic>;
export const IcArrow   = (p) => <Ic {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Ic>;
