// BlogCard.jsx — a single blog-post card, shared between the marketing site
// (shiksha-frontend's /blogs list) and the student dashboard's blog feed.
// Namespaced `.blg-*` so nothing collides with either app's own `.ac-*`
// (student/teacher dashboard) card system — see BlogCard.css.
//
// Navigation is left to the caller: pass `to` for an in-app react-router
// route (marketing site, same domain) or `href` for a plain link out to
// another origin (dashboard → marketing site's /blogs/<slug> reader).
import { Link } from "react-router-dom";

export default function BlogCard({ post, to, href }) {
  const inner = (
    <>
      <div className="blg-card__imageWrap">
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="blg-card__image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="blg-card__image blg-card__image--fallback" aria-hidden="true" />
        )}
        {post.category && <span className="blg-card__category">{post.category}</span>}
      </div>

      <div className="blg-card__content">
        <h3 className="blg-card__title">{post.title}</h3>
        {post.subtitle && <p className="blg-card__subtitle">{post.subtitle}</p>}

        {post.tags?.length > 0 && (
          <div className="blg-card__tags">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        <div className="blg-card__read">Read Blog →</div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="blg-card">
        {inner}
      </Link>
    );
  }

  const external = /^https?:\/\//.test(href || "");
  return (
    <a
      href={href}
      className="blg-card"
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {inner}
    </a>
  );
}
