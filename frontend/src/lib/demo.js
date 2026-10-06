// Static build flag (VITE_DEMO=1) — used by the GitHub Pages deployment.
//
// The static host still has no same-origin Node API, so workout history/settings remain local
// during the current migration. PT650 connected services are no longer a fake demo: Supabase
// Auth + the JWT-protected pt650-platform Edge Function provide the real account, Move and
// rewards backend. DEMO now means "static/local workout core", not "no backend anywhere".
//
// Vite replaces VITE_DEMO at build time, so legacy self-host-only UI can still fold away.
export const DEMO = import.meta.env.VITE_DEMO === '1'
export const DEMO_SEEDED = 'gym_demo_seeded_v1'
export const REPO = 'https://github.com/alalmaiesa-glitch/openGym'
