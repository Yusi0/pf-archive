import React, { useState, useMemo } from 'react';
import { POSTS, CATEGORIES } from '../data/posts';
import PostListItem from '../components/PostListItem';

export default function PostListPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = useMemo(() => {
    return POSTS.filter(post => {
      const matchCategory = selectedCategory === '전체' || post.category === selectedCategory;
      const matchSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchTerm]);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '1.8rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.2rem' }}>
          Archive Index
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          총 {filteredPosts.length}개의 문서
        </p>
      </header>

      {/* Filter Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                fontSize: '0.85rem',
                fontWeight: selectedCategory === category ? 700 : 400,
                color: selectedCategory === category ? 'var(--accent-orange)' : 'var(--text-secondary)',
                padding: 0
              }}
            >
              {category}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.35rem 0.6rem',
            border: '1px solid var(--border-line)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            outline: 'none',
            width: '160px',
            fontFamily: 'var(--font-mono)'
          }}
        />
      </div>

      {/* Vertical Post List */}
      {filteredPosts.length > 0 ? (
        <div className="post-list-vertical">
          {filteredPosts.map(post => (
            <PostListItem key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          검색어와 일치하는 문서가 없습니다.
        </div>
      )}
    </div>
  );
}
