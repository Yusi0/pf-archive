import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchContentPosts } from '../utils/contentApi';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TableOfContents from '../components/TableOfContents';

export default function PostDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [prevPost, setPrevPost] = useState(null);
  const [nextPost, setNextPost] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    async function load() {
      const loaded = await fetchContentPosts();
      const postIndex = loaded.findIndex(p => p.slug === slug || p.id === slug || p.filename === slug);

      if (postIndex >= 0) {
        setPost(loaded[postIndex]);
        setPrevPost(postIndex > 0 ? loaded[postIndex - 1] : null);
        setNextPost(postIndex < loaded.length - 1 ? loaded[postIndex + 1] : null);
      }
    }

    load();
  }, [slug]);

  if (!post) {
    return (
      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <h2>Document not found.</h2>
        <Link to="/" style={{ color: 'var(--text-secondary)', marginTop: '1rem', display: 'inline-block' }}>
          ← Return to Index
        </Link>
      </div>
    );
  }

  return (
    <div className="post-page-wrapper">
      <div className="post-layout-container">
        {/* Left Sticky Sidebar: TOC */}
        <aside className="post-toc-sidebar">
          <TableOfContents content={post.content} />
        </aside>

        {/* Center Main Article */}
        <article className="post-main-article">
          {/* Simple Text Breadcrumb & Edit Link */}
          <div className="post-nav-bar">
            <button
              onClick={() => navigate(-1)}
              style={{ color: 'var(--text-muted)', padding: 0, fontSize: 'inherit' }}
            >
              ← Back
            </button>

            <Link to={`/editor?id=${encodeURIComponent(post.filename || post.id)}`} style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
              [Edit / 수정]
            </Link>
          </div>

          {/* Article Header */}
          <header className="article-header">
            <h1 className="article-title">{post.title}</h1>
            <div className="article-meta-bar">
              <span>{post.date}</span>
            </div>
          </header>

          {/* Article Body */}
          <MarkdownRenderer content={post.content} />

          {/* Prev & Next Vertical Navigation */}
          <nav style={{
            marginTop: '3rem',
            paddingTop: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}>
            {prevPost && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  이전 글: 
                </span>{' '}
                <Link to={`/post/${prevPost.slug || prevPost.filename}`} style={{ color: 'var(--text-primary)' }}>
                  {prevPost.title}
                </Link>
              </div>
            )}
            {nextPost && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  다음 글: 
                </span>{' '}
                <Link to={`/post/${nextPost.slug || nextPost.filename}`} style={{ color: 'var(--text-primary)' }}>
                  {nextPost.title}
                </Link>
              </div>
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}
