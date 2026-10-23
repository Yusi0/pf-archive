import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isRemoteBackend, canShowEditLink } from '../utils/contentApi';

export default function Header({ theme, toggleTheme }) {
  const { pathname, search } = useLocation();
  // Whether this browser has signed in before (a UI hint; the edge function enforces who may write).
  const [signedIn, setSignedIn] = useState(() => isRemoteBackend && canShowEditLink());

  // Coming back from Discord, the tokens sit in the URL until the Supabase client reads them
  // (which also stores the session), so load it for that one visit.
  useEffect(() => {
    if (!isRemoteBackend) return;
    if (!/[#?&](access_token|code|error_description)=/.test(window.location.hash + window.location.search)) return;
    import('../lib/supabase')
      .then(({ supabase }) => supabase.auth.getSession())
      .then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  // Supabase is only downloaded when someone actually signs in or out.
  const login = async () => {
    const { signInWithDiscord } = await import('../lib/supabase');
    await signInWithDiscord(`${pathname}${search}`);
  };

  const logout = async () => {
    const { signOut } = await import('../lib/supabase');
    await signOut();
    setSignedIn(false);
  };

  return (
    <header className="site-header">
      <div className="shell-inner header-inner">
        <Link to="/" className="brand-logo">
          PF Archive
        </Link>

        <div className="header-actions">
          {(!isRemoteBackend || signedIn) && (
            <Link to="/editor" className="theme-btn">
              글쓰기
            </Link>
          )}
          {isRemoteBackend &&
            (signedIn ? (
              <button type="button" onClick={logout} className="theme-btn">
                로그아웃
              </button>
            ) : (
              <button type="button" onClick={login} className="theme-btn">
                로그인
              </button>
            ))}
          <button type="button" onClick={toggleTheme} className="theme-btn">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>
    </header>
  );
}
