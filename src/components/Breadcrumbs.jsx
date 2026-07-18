// Breadcrumbs — a slim bar that makes the active profile + location explicit on
// every page (audit finding #6, visible half). The leading crumb is the active
// learner profile; the rest are the path sections. Hidden on the dashboard root
// (the greeting header already names the profile there).
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./breadcrumbs.css";

// Drop pure ids (numeric or uuid-ish) so crumbs read as sections, not slugs.
const isId = (s) => /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s);
const titleCase = (s) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { isAuthenticated, activeProfile } = useAuth();

  if (!isAuthenticated) return null;
  if (pathname === "/") return null; // dashboard greeting already shows profile

  const segs = pathname.split("/").filter(Boolean);
  const crumbs = [];
  let acc = "";
  for (const seg of segs) {
    acc += `/${seg}`;
    if (isId(seg)) continue;
    crumbs.push({ label: titleCase(seg), to: acc });
  }

  const who = activeProfile?.display_name || "Learner";

  return (
    <nav className="bc" aria-label="Breadcrumb">
      <Link to="/" className="bc__id" title="Active profile">
        <span className="bc__idName">{who}</span>
        <span className="bc__idKind">Learner</span>
      </Link>
      {crumbs.map((c, i) => (
        <span className="bc__seg" key={c.to}>
          <span className="bc__sep" aria-hidden="true">›</span>
          {i === crumbs.length - 1 ? (
            <span className="bc__cur" aria-current="page">{c.label}</span>
          ) : (
            <Link to={c.to} className="bc__link">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
