import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchContentPosts } from '../utils/contentApi';
import PostListItem from '../components/PostListItem';
import { SearchIcon } from '../components/Icons';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContentPosts().then(setPosts).catch(err => setError(err.message));
  }, []);

  const term = searchTerm.trim().toLowerCase();
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(term) ||
    (post.summary && post.summary.toLowerCase().includes(term))
  );

  return (
    <div className="container home">
      <section className="home-intro">
        <h1 className="home-intro-title">Phantom Forces Archive</h1>
        <p className="home-intro-desc">
          Phantom Forces을 기록하는 개인용 문서입니다.
        </p>
      </section>

      <div className="home-toolbar">
        <div className="home-toolbar-left">
          <span className="home-count">글 {filteredPosts.length}개</span>
          {import.meta.env.DEV && (
            <Link to="/editor" className="home-new">+ 새 글</Link>
          )}
        </div>

        <label className="home-filter">
          <SearchIcon size={14} />
          <input
            type="search"
            placeholder="제목, 요약 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="글 검색"
          />
        </label>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="post-list-vertical">
          {filteredPosts.map((post) => (
            <PostListItem key={post.id || post.filename} post={post} />
          ))}
        </div>
      ) : (
        <div className="home-empty">
          {error
            ? `글 목록을 불러오지 못했습니다. (${error})`
            : term
              ? '검색 결과가 없습니다.'
              : '아직 작성된 아카이브 기록이 없습니다.'}
        </div>
      )}
    </div>
  );
}
