// src/components/CourseShopCard.jsx
// ──────────────────────────────────────────────────────────────────────────
// A single course "shop" card, driven by /courses/catalog/ data. Used by the
// Browse Courses page and the empty-state preview strip. Enrolled courses show
// an "Enrolled" state that links to the course instead of an enrol button.
// ──────────────────────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";
import { formatPrice } from "../api/catalog";

function Pill({ children }) {
  return <span className="shop-card__pill">{children}</span>;
}

export default function CourseShopCard({ course, busy, collectsMoney, onEnrol }) {
  const navigate = useNavigate();
  const price = formatPrice(course.price);
  const isFree = !course.price || course.price <= 0;

  return (
    <article className={`shop-card${course.is_enrolled ? " shop-card--owned" : ""}`}>
      <div className="shop-card__pills">
        {course.board?.name && <Pill>{course.board.name}</Pill>}
        {course.stream_name && <Pill>{course.stream_name}</Pill>}
        {course.is_enrolled && <span className="shop-card__owned">Enrolled</span>}
      </div>

      <h3 className="shop-card__title">{course.title}</h3>

      <p className="shop-card__meta">
        {course.lead_teacher && <span>{course.lead_teacher}</span>}
        {course.lead_teacher && course.subject_count > 0 && <span className="shop-card__dot">·</span>}
        {course.subject_count > 0 && (
          <span>
            {course.subject_count} subject{course.subject_count === 1 ? "" : "s"}
          </span>
        )}
      </p>

      {course.description && (
        <p className="shop-card__desc">{course.description}</p>
      )}

      <div className="shop-card__foot">
        <span className={`shop-card__price${isFree ? " shop-card__price--free" : ""}`}>
          {price}
        </span>

        {course.is_enrolled ? (
          <button
            type="button"
            className="shop-card__btn shop-card__btn--ghost"
            onClick={() => navigate(`/my-courses/${course.id}`)}
          >
            Go to course
          </button>
        ) : (
          <button
            type="button"
            className="shop-card__btn"
            disabled={busy}
            onClick={() => onEnrol?.(course)}
          >
            {busy
              ? "Enrolling…"
              : collectsMoney && !isFree
                ? "Enrol"
                : "Enrol — free"}
          </button>
        )}
      </div>
    </article>
  );
}
