import React from 'react';
import { Link } from 'react-router-dom';

export default function PostListItem({ post }) {
  return (
    <article className="post-item-row">
      <div className="post-item-meta">
        <span>{post.date}</span>
      </div>

      <h2 className="post-item-title">
        <Link to={`/post/${post.slug}`}>{post.title}</Link>
      </h2>

      <p className="post-item-summary">{post.summary}</p>
    </article>
  );
}
