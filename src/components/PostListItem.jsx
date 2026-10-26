import React from 'react';
import { Link } from 'react-router-dom';

export default function PostListItem({ post, views }) {
  return (
    <article className="post-item-row">
      <Link to={`/post/${post.slug}`} className="post-item-link">
        <div className="post-item-meta">
          <span>{post.date}</span>
          {typeof views === 'number' && <span>조회 {views.toLocaleString('en-US')}</span>}
        </div>
        <h2 className="post-item-title">{post.title}</h2>
        {post.summary && <p className="post-item-summary">{post.summary}</p>}
      </Link>
    </article>
  );
}
