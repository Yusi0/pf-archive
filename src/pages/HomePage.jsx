import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchContentPosts } from '../utils/contentApi';
import PostListItem from '../components/PostListItem';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      const data = await fetchContentPosts();
      setPosts(data);
    }
    load();
  }, []);

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.summary && post.summary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
      {/* Intro */}
      <section className="home-intro">
        <h1 className="home-intro-title">Phantom Forces Archive</h1>
        <p className="home-intro-desc">
          Phantom Forces을 기록하는 개인용 문서입니다.
        </p>
      </section>

      {/* Index Header & New Post Link */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            TIMELINE ({filteredPosts.length})
          </span>
          <Link
            to="/editor"
            style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textDecoration: 'underline' }}
          >
            [+ Editor / 글쓰기]
          </Link>
        </div>

        <input
          type="text"
          placeholder="Filter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
            width: '120px'
          }}
        />
      </div>

      {/* Vertical Timeline Post Index */}
      {filteredPosts.length > 0 ? (
        <div className="post-list-vertical">
          {filteredPosts.map((post) => (
            <PostListItem key={post.id || post.filename} post={post} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          아직 작성된 아카이브 기록이 없습니다.{' '}
          <Link to="/editor" style={{ textDecoration: 'underline' }}>
            에디터에서 새 기록을 작성해보세요.
          </Link>
        </div>
      )}
    </div>
  );
}
