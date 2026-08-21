// src/components/courseCover.js
// ──────────────────────────────────────────────────────────────────────────
// Cover colour + glyph for a catalog course card (see CourseShopCard).
//
// Lives in its own module, not inside CourseShopCard.jsx, for two reasons:
// the react-refresh lint rule forbids non-component exports from a component
// file, and the "no two cards render the same cover" property below is worth
// asserting directly against the real code rather than a re-implementation.
// ──────────────────────────────────────────────────────────────────────────

/* Every card gets a cover, whether or not the CMS has a thumbnail. In practice
   none of the live courses have one, so without this the grid is a wall of
   bare text blocks with no visual anchor.

   Colour is keyed on WHAT THE COURSE IS, never on a hash of its text. For
   academic courses that means the class number, so it reads as deliberate
   class-level colour coding: every Class 9 card is the same green, every
   Class 12 the same violet. Hashing the title instead gave three identical
   purple covers out of eight — indistinguishable from a bug. */
export const CLASS_HUES = {
  8: 152,   // green
  9: 176,   // teal
  10: 206,  // blue
  11: 258,  // indigo
  12: 288,  // violet
};

/* Non-academic courses (the competitive-exam coaching catalog) are keyed on
   their CourseCategory slug — the same enum the Browse filter chips are built
   from, and the same one the catalog seeder assigns. Each of the seven live
   coaching courses carries exactly one, and all seven are distinct, so this
   map is collision-free BY CONSTRUCTION, exactly the way CLASS_HUES is for
   academic courses.

   This replaced hashing the 2-letter glyph into a 5-entry palette. That could
   not work: seven courses into five buckets collides by pigeonhole, and it did
   — "Defence Exams" and "UPSC & Civil Services" both rendered hue 320, and
   "IIT-JEE Preparation" and "NEET Preparation" both rendered 340, two pairs of
   pixel-identical covers sitting in the same grid. Hashing into a longer
   palette only lowers the odds; it never rules collisions out.

   Positional assignment (pass the card's index in the group) would also be
   collision-free, but it is not stable: Browse renders a SEARCHED AND FILTERED
   list, so a course would change colour as the user types, and the dashboard
   empty state renders its own three-course slice, so the same course would
   wear different colours on two screens. The category is a property of the
   course itself, so it survives both.

   Hues MUST stay disjoint from CLASS_HUES and their ±11 nudge bands (141-163,
   165-187, 195-217, 247-269, 277-299) — an earlier palette reused 206 and 258,
   so "NEET Preparation" rendered the exact same indigo as the "Class 11
   (Commerce)" card sitting next to it. That leaves 0-140, 188-194, 218-246,
   270-276 and 300-360 to draw from; the 188-194 and 270-276 slivers are left
   unused because they are too narrow to absorb a nudge if one of these courses
   ever gains a board or stream. Closest pair here is 20° apart (320 vs 340),
   matching the tightest gap already shipping. */
export const CATEGORY_HUES = {
  olympiad: 22,   // amber
  ca: 44,         // gold
  ssc: 96,        // olive — "Government Exams"
  neet: 124,      // green — medical
  upsc: 232,      // blue
  defence: 320,   // magenta
  jee: 340,       // pink
};

/* Last resort, for a course that is neither class-numbered nor in a category
   we have a hue for (a new coaching category, say). Hashing is acceptable here
   ONLY because it is the unknown case — the fix for a collision at this point
   is to give the new category a CATEGORY_HUES entry, not a longer palette.

   Unlike CATEGORY_HUES these ARE nudged, so each entry occupies a ±11 band and
   has to clear a lot: every CLASS_HUES band (so >22° from each) and every
   CATEGORY_HUES point (so >11° from each). Once the class bands eat 141-299,
   that leaves only three usable windows on the whole wheel — 352-10, 56-84 and
   108-112 — hence four entries rather than a longer list. Do not add one by
   eye; the earlier palette [12, 60, 110, 232, 310, 350] looked spread out and
   had three reachable collisions in it: 232 was *exactly* CATEGORY_HUES.upsc,
   310 nudged down to 299 which is precisely Class 12 Arts (MBSE), and 12 and
   350 both reached the olympiad/jee points. Re-derive by brute force against
   both maps instead. */
export const FALLBACK_HUES = [4, 60, 84, 110];

/* A hue nudge inside the class's colour family, so two courses at the same
   class level stay tellable apart. Two things distinguish such courses, and
   both go into the nudge:

     stream  — Class 11/12 come in Science / Commerce / Arts
     board   — MBSE and CBSE each run their own Class 8/9/10 with a genuinely
               different syllabus

   Assigned from those two enums DIRECTLY rather than by hashing the title.
   Hashing was the original approach and it does not work here: the nudge has
   only three buckets, and three streams hashed into three buckets collide far
   more often than not (only 6 of 27 assignments are collision-free). In
   practice it shipped "Class 12 Commerce" and "Class 12 Science" in the same
   violet, and normalising the titles so the two Class 9s no longer differed by
   stray punctuation collapsed those onto one colour too. Deriving the offset
   from (stream, board_type) instead encodes something real — science always
   sits at the cool end of its family, central boards a shade below state ones.

   The guarantee is over the catalog's actual SHAPE, not over every conceivable
   input: classes 8-10 never carry a stream, 11-12 always do, and a competitive
   course is never class-numbered. Within that, all 18 academic courses (5
   classes × the streams they support × 2 boards) are distinct. It is NOT
   distinct for arbitrary combinations, because COMMERCE and "no stream" both
   nudge 0, as do COMPETITIVE and "no board" — so a stream-less "Class 11"
   added alongside "Class 11 Commerce" WOULD collide. There is no room to
   separate them: a fourth stream bucket needs ≥7° of spacing to clear the ±3
   board offsets, which pushes the total past the ±12 ceiling below. If such a
   course is ever added, give it a real stream or widen CLASS_HUES' spacing
   first.

   Total stays STRICTLY inside ±12, half the smallest gap between adjacent
   CLASS_HUES (152→176 is 24); at ±12 a nudged Class 8 and a nudged Class 9
   both land on 164 and render identically. Worst case here is ±11. */
const STREAM_NUDGE = { SCIENCE: -8, COMMERCE: 0, ARTS: 8 };
const BOARD_NUDGE = { CENTRAL: -3, STATE: 3, COMPETITIVE: 0 };

export function coverNudge(course) {
  return (
    (STREAM_NUDGE[course.stream_name] ?? 0) +
    (BOARD_NUDGE[course.board?.board_type] ?? 0)
  );
}

/* The one category hue a course resolves to. `categories` is a many-to-many on
   the backend, so a course may carry several slugs and the API's array order is
   not guaranteed — walk CATEGORY_HUES in ITS declaration order instead, so the
   answer never depends on how the rows came back. */
function categoryHue(course) {
  const slugs = course.category_slugs;
  if (!Array.isArray(slugs) || slugs.length === 0) return null;
  for (const slug of Object.keys(CATEGORY_HUES)) {
    if (slugs.includes(slug)) return CATEGORY_HUES[slug];
  }
  return null;
}

/* The final `--cover-hue` for a card, nudge included. */
export function coverHue(course, glyph = "") {
  const n = parseInt(glyph, 10);
  if (Number.isFinite(n) && CLASS_HUES[n] != null) {
    return CLASS_HUES[n] + coverNudge(course);
  }

  // A category hue is already unique to that course, so it is NOT nudged —
  // nudging exists only to split a shared class family, and applying it here
  // would just walk a distinct hue toward its neighbours.
  const byCategory = categoryHue(course);
  if (byCategory != null) return byCategory;

  let h = 0;
  for (let i = 0; i < glyph.length; i++) h = (h * 33 + glyph.charCodeAt(i)) % 9973;
  return FALLBACK_HUES[h % FALLBACK_HUES.length] + coverNudge(course);
}

/* A short glyph for the cover: the class number when the title carries one
   ("Class -11 ( Science)" → "11"), else the board's initials, else the first
   letter. Keeps competitive courses ("NEET") sensible too. */
export function coverGlyph(course) {
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
