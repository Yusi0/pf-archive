import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import EditorPage from './pages/EditorPage';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pf_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pf_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header theme={theme} toggleTheme={toggleTheme} />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/post/:slug" element={<PostDetailPage />} />
            <Route path="/editor" element={<EditorPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
