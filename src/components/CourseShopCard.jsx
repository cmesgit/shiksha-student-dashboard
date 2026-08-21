// src/components/CourseShopCard.jsx
// ──────────────────────────────────────────────────────────────────────────
// A single course "shop" card, driven by /courses/catalog/ data. Used by the
// Browse Courses page and the empty-state preview strip. Enrolled courses show
// an "Enrolled" state that links to the course instead of an enrol button.
// ──────────────────────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";
import { formatPrice } from "../api/catalog";
import { coverGlyph, coverHue } from "./courseCover";

function Pill({ children }) {
  return <span className="shop-card__pill">{children}</span>;
}

export default function CourseShopCard({ course, busy, collectsMoney, onEnrol }) {
  const navigate = useNavigate();

  // The action matches useEnroll: a free one-tap enrol unless the live payment
  // mode collects money. Keep the price label and button in step with it, so a
  // course never shows a rupee price next to an "Enrol — free" button.
  // A coming-soon course is never purchasable regardless of payment mode.
  const willFreeEnrol = !collectsMoney;
  const priceLabel = willFreeEnrol ? "Free" : formatPrice(course.price);
  const priceIsFree = priceLabel === "Free";
  const showMrp = course.mrp && course.mrp > course.price;
  const glyph = coverGlyph(course);

  return (
    <article className={`shop-card${course.is_enrolled ? " shop-card--owned" : ""}${course.is_coming_soon ? " shop-card--soon" : ""}`}>
      {course.thumbnail ? (
        <img src={course.thumbnail} alt="" className="shop-card__thumb" />
      ) : (
        <div
          className="shop-card__cover"
          style={{ "--cover-hue": coverHue(course, glyph) }}
          aria-hidden="true"
        >
          <span className="shop-card__cover-glyph">{glyph}</span>
        </div>
      )}
      <div className="shop-card__pills">
        {course.board?.name && <Pill>{course.board.name}</Pill>}
        {course.stream_name && <Pill>{course.stream_name}</Pill>}
        {course.is_coming_soon && <span className="shop-card__soon">Coming Soon</span>}
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
        <span className="shop-card__priceWrap">
          {showMrp && <span className="shop-card__mrp">{formatPrice(course.mrp)}</span>}
          <span className={`shop-card__price${priceIsFree ? " shop-card__price--free" : ""}`}>
            {course.is_coming_soon ? "—" : priceLabel}
          </span>
          {course.discount_label && (
            <span className="shop-card__discount">{course.discount_label}</span>
          )}
        </span>

        {course.is_coming_soon ? (
          <button type="button" className="shop-card__btn shop-card__btn--ghost" disabled>
            Coming Soon
          </button>
        ) : course.is_enrolled ? (
          <button
            type="button"
            className="shop-card__btn shop-card__btn--ghost"
            onClick={() => navigate(`/my-courses/${course.id}`)}
          >
            Go to course
          </button>
        ) : course.request_pending ? (
          <button
            type="button"
            className="shop-card__btn shop-card__btn--ghost"
            disabled
          >
            Pending approval
          </button>
        ) : (
          <button
            type="button"
            className="shop-card__btn"
            disabled={busy}
            onClick={() => onEnrol?.(course)}
          >
            {busy ? "Enrolling…" : willFreeEnrol ? "Enrol — free" : "Enrol"}
          </button>
        )}
      </div>
    </article>
  );
}
