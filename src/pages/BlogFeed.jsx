// src/pages/BlogFeed.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy blog feed — reads the same CMS-driven /content/blogs/ posts the
// marketing site's /blogs list shows, rendered with the shared BlogCard.
// Reading a post happens on the marketing site (no in-dashboard reader here
// yet), so each card links out to HOME_URL + /blogs/<slug>.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { getBlogFeed } from "../api/blogs";
import BlogCard from "../components/BlogCard";
import { HOME_URL } from "../config/urls";
import "../components/BlogCard.css";
import "../styles/academyCommon.css";

export default function BlogFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getBlogFeed().then((rows) => {
      if (alive) {
        setPosts(rows);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="ac-page">
      <div className="ac-page__head">
        <h1 className="ac-page__title">Blogs</h1>
        <p className="ac-page__sub">
          Chapter-wise study articles to go alongside your subjects.
        </p>
      </div>

      {loading ? null : posts.length === 0 ? (
        <div className="ac-empty">
          <div className="ac-empty__icon ac-empty__icon--muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 className="ac-empty__title">No blogs yet</h2>
          <p className="ac-empty__text">Check back soon — new articles will show up here.</p>
        </div>
      ) : (
        <div className="blg-grid">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} href={`${HOME_URL}/blogs/${post.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
