import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { getPublicConfig } from "../api/publicConfig";
import "../styles/dashboardTicker.css";

/* "From ShikshaCom" — the student dashboard's ticker card
 * (design_handoff_live_ticker Phase 7, slot 5).
 *
 * ⚠ NOT RENDERED ON MOBILE, and that needs no code: this mounts inside
 * `.dashboardRight`, which lives under the `.desktopOnly` wrapper
 * (`Dashboard.jsx:725`) that `dashboard.css:873` removes entirely below
 * 768px. The mobile tab set is fixed at `TopSliderTabs.jsx:5` with no ticker
 * slot, and the decision (2026-09-10) was not to add one — a learner on a
 * phone still gets the queue through the navbar strip on the public site.
 * Between 769 and 1200px the rail becomes two side-by-side cards and this
 * lands beside the calendar at roughly half width, which it is built for.
 */

const KIND_LABEL = {
  new_course: "New course", enrolment: "Enrolment", new_mentor: "New mentor",
  practice: "Practice", deadline: "Deadline", milestone: "Milestone",
  current_affairs: "Current affairs", mentor_spotlight: "Mentors",
};

export default function DashboardTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    getPublicConfig()
      .then((cfg) => {
        if (!alive || !cfg.live_ticker_enabled) return null;
        return api.get("/content/announcements/", { params: { slot: "dashboard" } });
      })
      .then((res) => { if (alive && res) setItems(res.data || []); })
      .catch(() => { /* leave the rail as it was — never render an empty shell */ });
    return () => { alive = false; };
  }, []);

  if (!items.length) return null;

  return (
    <section className="dashboardCard stk" aria-labelledby="stk-h">
      <div className="stk__head">
        <h3 className="stk__title" id="stk-h">From ShikshaCom</h3>
      </div>
      <ul className="stk__list">
        {items.slice(0, 4).map((it) => {
          const inner = (
            <>
              <span className="stk__kind">{KIND_LABEL[it.kind] || "Update"}</span>
              <span className="stk__text">{it.message}</span>
              {it.metric && (
                <span className="stk__metric">
                  <b>{it.metric.value}</b> {it.metric.label}
                </span>
              )}
            </>
          );
          return (
            <li className="stk__row" key={it.id}>
              {it.link_url
                ? <a className="stk__link" href={it.link_url}>{inner}</a>
                : <span className="stk__link">{inner}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
