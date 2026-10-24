// ── Button style tokens ──────────────────────────────────────────────────────

export const BTN_GHOST     = 'cursor-pointer bg-[#2a2a2a] border border-white/25 rounded-lg text-white transition-colors hover:bg-[#3d3d3d] active:bg-[#333] disabled:opacity-35 disabled:pointer-events-none';
export const BTN_PRIMARY   = 'cursor-pointer bg-white text-black font-bold rounded-lg transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-35 disabled:pointer-events-none';
export const BTN_CANCEL    = 'cursor-pointer border border-white/25 rounded-xl text-gray-200 transition-colors hover:bg-white/10 active:bg-white/15';
export const BTN_DELETE    = 'cursor-pointer bg-red-500/15 border border-red-500/35 text-red-400 font-bold rounded-xl transition-colors hover:bg-red-500/30 active:bg-red-500/40';
export const BTN_ARROW_OFF = 'bg-[#2a2a2a] text-white transition-colors hover:bg-[#3d3d3d] active:bg-[#333]';
export const BTN_ICON_DEL  = 'cursor-pointer text-gray-400 transition-colors hover:text-red-400 active:text-red-500';
export const BTN_MENU_ITEM = `px-3 py-2 text-xs text-left whitespace-nowrap ${BTN_GHOST}`;

export const MODAL_BACKDROP = 'fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/80 p-4';
export const MODAL_CARD     = 'bg-[#1a1a1a] border border-white/25 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5 max-h-[92dvh] overflow-y-auto';
export const INPUT          = 'w-full bg-[#111] border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/60 transition-colors';
