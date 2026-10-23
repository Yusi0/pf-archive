import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchContentPosts, canShowEditLink } from '../utils/contentApi';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TableOfContents from '../components/TableOfContents';
import FontSizeControl from '../components/FontSizeControl';
import PostTimeline from '../components/PostTimeline';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import BackToTop from '../components/BackToTop';

export default function PostDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [olderPost, setOlderPost] = useState(null);
  const [newerPost, setNewerPost] = useState(null);
  const [error, setError] = useState(null);

  // A direct visit (e.g. from a Discord embed) has no in-app history: go to the list instead of leaving the site.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    let cancelled = false;

    // Shows the post from a list of posts; runs again when the owner's fresher list arrives.
    function apply(loaded) {
      if (cancelled) return;
      let postIndex = loaded.findIndex(p => p.slug === slug || p.id === slug || p.filename === slug);

      // Backwards-compatibility fallback for older URL slugs
      if (postIndex === -1 && slug) {
        const decoded = decodeURIComponent(slug).toLowerCase();
        if (decoded.includes('11170') || decoded.includes('2026-10-03')) {
          postIndex = loaded.findIndex(p => p.slug === '2026-10-03-01');
        } else if (decoded.includes('250505') || decoded.includes('axisangle')) {
          postIndex = loaded.findIndex(p => p.slug === '2026-09-24-02');
        } else if (decoded.includes('250419') || (decoded.includes('2026-09-24') && decoded.includes('lito'))) {
          postIndex = loaded.findIndex(p => p.slug === '2026-09-24-01');
        } else if (decoded.includes('2025-04-07') || decoded.includes('250407')) {
          postIndex = loaded.findIndex(p => p.slug === '2025-04-07-01');
        }
      }

      if (postIndex >= 0) {
        // `loaded` is sorted newest first: the previous index is the newer post.
        setAllPosts(loaded);
        setPost(loaded[postIndex]);
        setNewerPost(postIndex > 0 ? loaded[postIndex - 1] : null);
        setOlderPost(postIndex < loaded.length - 1 ? loaded[postIndex + 1] : null);
      }
    }

    fetchContentPosts({ onFresh: apply })
      .then(apply)
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!post) {
    return (
      <div className="container post-missing">
        <h2>{error ? '글을 불러오지 못했습니다.' : 'Document not found.'}</h2>
        {error && <p>{error}</p>}
        <Link to="/" className="post-missing-link">← 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="post-page-wrapper">
      <BackToTop />
      <div className="post-layout-container">
        <aside className="post-toc-sidebar">
          <TableOfContents content={post.content} />
        </aside>

        <article className="post-main-article">
          <div className="post-nav-bar">
            <button type="button" className="post-back" onClick={goBack}>
              ← 목록
            </button>

            <div className="post-nav-actions">
              {/* Compact prev/next (narrow layouts only; wide layouts have the timeline) */}
              <div className="post-step-nav">
                {olderPost ? (
                  <Link to={`/post/${olderPost.slug || olderPost.filename}`} className="icon-btn" aria-label="이전 글" title="이전 글">
                    <ChevronLeftIcon />
                  </Link>
                ) : (
                  <span className="icon-btn is-disabled" aria-label="이전 글 없음" role="img"><ChevronLeftIcon /></span>
                )}
                {newerPost ? (
                  <Link to={`/post/${newerPost.slug || newerPost.filename}`} className="icon-btn" aria-label="다음 글" title="다음 글">
                    <ChevronRightIcon />
                  </Link>
                ) : (
                  <span className="icon-btn is-disabled" aria-label="다음 글 없음" role="img"><ChevronRightIcon /></span>
                )}
              </div>
              {canShowEditLink() && (
                <Link to={`/editor?id=${encodeURIComponent(post.filename || post.id)}`} className="post-edit-link">
                  [Edit / 수정]
                </Link>
              )}
              <FontSizeControl
                storageKey="pf_reading_scale"
                cssVar="--reading-scale"
                smallerLabel="글자 작게"
                largerLabel="글자 크게"
              />
            </div>
          </div>

          <header className="article-header">
            <h1 className="article-title">{post.title}</h1>
            <div className="article-meta-bar">
              <span>{post.date}</span>
            </div>
          </header>

          <MarkdownRenderer content={post.content} />

          {(olderPost || newerPost) && (
            <nav className="post-pager" aria-label="이전 글 / 다음 글">
              {olderPost ? (
                <Link to={`/post/${olderPost.slug || olderPost.filename}`} className="post-pager-item">
                  <span className="post-pager-label">← 이전 글</span>
                  <span className="post-pager-title">{olderPost.title}</span>
                  <span className="post-pager-date">{olderPost.date}</span>
                </Link>
              ) : <span />}
              {newerPost ? (
                <Link to={`/post/${newerPost.slug || newerPost.filename}`} className="post-pager-item is-next">
                  <span className="post-pager-label">다음 글 →</span>
                  <span className="post-pager-title">{newerPost.title}</span>
                  <span className="post-pager-date">{newerPost.date}</span>
                </Link>
              ) : <span />}
            </nav>
          )}
        </article>

        <aside className="post-timeline-sidebar">
          <PostTimeline posts={allPosts} currentSlug={post.slug} />
        </aside>
      </div>
    </div>
  );
}
