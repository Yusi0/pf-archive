import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import AuthStatus from './components/AuthStatus';

// Lazy so the editor (and its stylesheet) is only downloaded on /editor. On the deployed site
// it sits behind AuthGate (Discord sign-in) and saves through the pf-content edge function.
const EditorPage = React.lazy(() => import('./pages/EditorPage'));
const AuthGate = React.lazy(() => import('./components/AuthGate'));

/**
 * Shared page frame. `data-layout` sets --shell-width so the header and footer line up
 * with the page's content column (reading column on home, TOC + article on posts).
 */
function Shell({ theme, toggleTheme }) {
  const { pathname } = useLocation();
  const isEditor = pathname.startsWith('/editor');
  const layout = isEditor ? 'editor' : pathname.startsWith('/post/') ? 'wide' : 'narrow';

  return (
    <div className="app-shell" data-layout={layout}>
      <AuthStatus />
      {!isEditor && <Header theme={theme} toggleTheme={toggleTheme} />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/post/:slug" element={<PostDetailPage />} />
          <Route
            path="/editor"
            element={
              <Suspense fallback={null}>
                <AuthGate>
                  <EditorPage />
                </AuthGate>
              </Suspense>
            }
          />
        </Routes>
      </main>
      {!isEditor && <Footer />}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('pf_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pf_theme', theme);
    } catch {
      // Storage unavailable: theme still applies for this session.
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#1e1e1e' : '#e1e1e1');
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Shell theme={theme} toggleTheme={toggleTheme} />
    </Router>
  );
}
