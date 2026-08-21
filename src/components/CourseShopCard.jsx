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

/* Every card gets a cover, whether or not the CMS has a thumbnail. In practice
   none of the live courses have one, so without this the grid is a wall of
   bare text blocks with no visual anchor.

   Colour is keyed on the GLYPH (the class number), not a hash of the title, so
   it reads as deliberate class-level colour coding: every Class 9 card is the
   same green, every Class 12 the same violet. Hashing the title instead gave
   three identical purple covers out of eight — indistinguishable from a bug.
   A small hue nudge from the full title then keeps same-class variants
   ("Class 12 (Science)" vs "(Arts)") tellable apart while staying in family. */
const CLASS_HUES = {
  8: 152,   // green
  9: 176,   // teal
  10: 206,  // blue
  11: 258,  // indigo
  12: 288,  // violet
};
/* MUST stay disjoint from CLASS_HUES (and their ±8 nudge bands: 144-160,
   168-184, 198-214, 250-266, 280-296) — this list previously reused 206 and
   258, so "NEET Preparation" rendered the exact same indigo as
   "Class 11 (Commerce)" sitting next to it. */
const FALLBACK_HUES = [22, 44, 96, 320, 340];

function coverHue(glyph = "") {
  const n = parseInt(glyph, 10);
  if (Number.isFinite(n) && CLASS_HUES[n] != null) return CLASS_HUES[n];
  // Non-class courses (NEET, UPSC…) spread over the remaining hues, keyed on
  // the glyph so a given course is always the same colour.
  let h = 0;
  for (let i = 0; i < glyph.length; i++) h = (h * 33 + glyph.charCodeAt(i)) % 9973;
  return FALLBACK_HUES[h % FALLBACK_HUES.length];
}

/* -8 / 0 / +8 degrees, so streams of the same class differ without leaving the
   class's colour family. Kept STRICTLY under half the smallest gap between
   adjacent CLASS_HUES (152→176 is 24) — at ±12 a nudged Class 8 and a nudged
   Class 9 both landed on 164 and rendered identically. */
function coverNudge(title = "") {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 9973;
  return (h % 3) * 8 - 8;
}

/* A short glyph for the cover: the class number when the title carries one
   ("Class -11 ( Science)" → "11"), else the board's initials, else the first
   letter. Keeps competitive courses ("NEET") sensible too. */
function coverGlyph(course) {
  const cls = /class\s*-?\s*(\d{1,2})/i.exec(course.title || "");
  if (cls) return cls[1];
  // TITLE first, not the board: keying off the board made every competitive
  // course read "CB" (from CBSE) — "NEET Preparation" has to say NE.
  const src = (course.title || course.board?.name || "?").trim();
  const words = src.split(/\s+/).filter(Boolean);
  return (words.length > 1
    ? words.slice(0, 2).map((w) => w[0]).join("")
    : src.slice(0, 2)
  ).toUpperCase();
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
          style={{ "--cover-hue": coverHue(glyph) + coverNudge(course.title) }}
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
