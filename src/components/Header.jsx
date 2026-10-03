import React from 'react';
import { Link } from 'react-router-dom';

export default function Header({ theme, toggleTheme }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand-logo">
          PF Archive
        </Link>

        <div>
          <button onClick={toggleTheme} className="theme-btn">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>
    </header>
  );
}
