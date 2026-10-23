import React, { useEffect, useRef, useState } from 'react';
import { isRemoteBackend } from '../utils/contentApi';
import { AUTH_EVENT, notifyAuth } from '../lib/authEvents';

const TOAST_MS = 2600;
const OAUTH_RETURN = /[#?&](access_token|code|error_description)=/;

/**
 * Mounted once for the whole app: finishes a Discord sign-in when the browser comes back with
 * the tokens in the URL, and shows a short status toast at the top ("로그인 완료" etc.).
 */
export default function AuthStatus() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  // The element stays mounted so it can slide in from / out to the top by toggling `is-visible`.
  useEffect(() => {
    const onAuth = (e) => {
      const text = e.detail?.message;
      if (!text) return;
      setMessage(text);
      setVisible(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), TOAST_MS);
    };
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      clearTimeout(timer.current);
    };
  }, []);

  // Back from Discord: the tokens sit in the URL until the Supabase client reads them (which
  // also stores the session), so load it for that one visit.
  useEffect(() => {
    if (!isRemoteBackend || !OAUTH_RETURN.test(window.location.hash + window.location.search)) return;
    const failed = /error_description=/.test(window.location.hash + window.location.search);
    import('../lib/supabase')
      .then(({ supabase }) => supabase.auth.getSession())
      .then(({ data }) => notifyAuth(data.session && !failed ? '로그인 완료' : '로그인에 실패했습니다'))
      .catch(() => notifyAuth('로그인에 실패했습니다'));
  }, []);

  return (
    <div className={`auth-toast${visible ? ' is-visible' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
