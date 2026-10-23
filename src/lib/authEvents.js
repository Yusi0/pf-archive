// Tiny bridge so the header buttons, the sign-in return handler and the toast stay decoupled
// (and so the Supabase client is not pulled into every page just to announce a state change).
export const AUTH_EVENT = 'pf-auth';

/** Tell the UI the sign-in state changed; `message` (optional) is shown as a toast. */
export function notifyAuth(message) {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { message } }));
}
