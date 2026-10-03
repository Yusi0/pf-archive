import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { POSTS, CATEGORIES, ALL_TAGS } from '../data/posts';
import PostListItem from '../components/PostListItem';

export default function CategoryTagPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedTag = queryParams.get('tag');
  const selectedCategory = queryParams.get('category');

  let activeTitle = 'Categories & Tags';
  let filteredPosts = POSTS;

  if (selectedTag) {
    activeTitle = `#${selectedTag}`;
    filteredPosts = POSTS.filter(post => post.tags.includes(selectedTag));
  } else if (selectedCategory) {
    activeTitle = `${selectedCategory}`;
    filteredPosts = POSTS.filter(post => post.category === selectedCategory);
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '1.8rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.2rem' }}>
          {activeTitle}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          총 {filteredPosts.length}개의 관련 문서
        </p>
      </header>

      {/* Categories & Tags List */}
      <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            CATEGORIES
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', fontSize: '0.85rem' }}>
            {CATEGORIES.filter(c => c !== '전체').map(cat => (
              <Link
                key={cat}
                to={`/tags?category=${encodeURIComponent(cat)}`}
                style={{
                  color: selectedCategory === cat ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  fontWeight: selectedCategory === cat ? 700 : 400
                }}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            TAGS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            {ALL_TAGS.map(tag => (
              <Link
                key={tag}
                to={`/tags?tag=${encodeURIComponent(tag)}`}
                style={{
                  color: selectedTag === tag ? 'var(--accent-orange)' : 'var(--text-muted)',
                  fontWeight: selectedTag === tag ? 700 : 400
                }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
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
          해당 분류의 문서가 없습니다.
        </div>
      )}
    </div>
  );
}
