import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Tag } from 'lucide-react';

export default function PostCard({ post }) {
  return (
    <article className="post-card">
      <div>
        <div className="post-card-meta">
          <span className="post-category">{post.category}</span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={13} /> {post.date}
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={13} /> {post.readTime}
          </span>
        </div>

        <h2 className="post-card-title">
          <Link to={`/post/${post.slug}`}>{post.title}</Link>
        </h2>

        <p className="post-card-summary">{post.summary}</p>
      </div>

      <div className="post-card-footer">
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {post.tags.map((tag) => (
            <Link key={tag} to={`/tags?tag=${encodeURIComponent(tag)}`} className="tag-chip">
              #{tag}
            </Link>
          ))}
        </div>
        <Link
          to={`/post/${post.slug}`}
          style={{ color: 'var(--accent-pf)', fontWeight: 600, fontSize: '0.85rem' }}
        >
          읽기 →
        </Link>
      </div>
    </article>
  );
}
