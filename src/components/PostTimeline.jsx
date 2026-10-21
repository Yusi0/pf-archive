import React from 'react';
import { Link } from 'react-router-dom';

const MAX_ITEMS = 10;

/** Quiet right-column list of recent posts (newest first); the current post is emphasised. */
export default function PostTimeline({ posts, currentSlug }) {
  if (!posts || posts.length === 0) return null;

  const shown = posts.slice(0, MAX_ITEMS);
  const hasMore = posts.length > MAX_ITEMS;

  return (
    <nav className="post-timeline" aria-label="글 목록">
      <div className="sidebar-toc-title">POSTS</div>
      <ul className="timeline-list">
        {shown.map((p) => {
          const isCurrent = p.slug === currentSlug;
          return (
            <li key={p.slug || p.filename} className={`timeline-item${isCurrent ? ' is-current' : ''}`}>
              <Link
                to={`/post/${p.slug || p.filename}`}
                aria-current={isCurrent ? 'page' : undefined}
                title={p.title}
              >
                <span className="timeline-date">{p.date}</span>
                <span className="timeline-title">{p.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <Link to="/" className="timeline-more">
          전체 보기 →
        </Link>
      )}
    </nav>
  );
}
