import React from 'react';
import { Link } from 'react-router-dom';
import { isRemoteBackend } from '../utils/contentApi';
import { signInWithDiscord, signOut } from '../lib/supabase';
import { useSession } from '../lib/useSession';

/**
 * The editor is only for the site owner. While developing against the local Vite server there
 * is nothing to guard; on the deployed site it needs a Discord sign-in (the edge function
 * re-checks who is signed in on every write, so this screen is a convenience, not the lock).
 */
export default function AuthGate({ children }) {
  if (!isRemoteBackend) return children;
  return <RemoteGate>{children}</RemoteGate>;
}

function RemoteGate({ children }) {
  const session = useSession();

  if (session === undefined) return null;
  if (session) return children;

  return (
    <div className="auth-gate">
      <h1 className="auth-gate-title">PF Archive 편집</h1>
      <p className="auth-gate-text">편집하려면 Discord로 로그인하세요.</p>
      <button type="button" className="auth-gate-btn" onClick={() => signInWithDiscord('/editor')}>
        Discord로 로그인
      </button>
      <Link to="/" className="auth-gate-back">← 홈으로</Link>
    </div>
  );
}

export function SignOutButton({ className }) {
  return (
    <button type="button" className={className} onClick={() => signOut()}>
      로그아웃
    </button>
  );
}
