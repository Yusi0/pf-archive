import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';

// The editor only exists in dev (it needs the Vite dev-server API). Lazy + DEV-gated so
// neither the page nor its stylesheet is emitted into the production bundle.
const EditorPage = import.meta.env.DEV ? React.lazy(() => import('./pages/EditorPage')) : null;

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
      {!isEditor && <Header theme={theme} toggleTheme={toggleTheme} />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/post/:slug" element={<PostDetailPage />} />
          {EditorPage && (
            <Route
              path="/editor"
              element={
                <Suspense fallback={null}>
                  <EditorPage />
                </Suspense>
              }
            />
          )}
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
