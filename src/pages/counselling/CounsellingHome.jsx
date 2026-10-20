import { Link } from "react-router-dom";
import { HOME_URL } from "../../config/urls";

const fmtWhen = (value) => new Date(value).toLocaleString("en-IN", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
});

export default function CounsellingHome({ profile, user, intake, upcoming, past, progress, bookUrl }) {
  const completed = (past || []).filter((s) => s.status === "completed");
  const relevant = [...(upcoming || []), ...completed];
  const bookedCount = (upcoming || []).length + (past || []).length;
  const counsellors = [...new Map(relevant.filter((s) => s.counselor?.id)
    .map((s) => [s.counselor.id, s.counselor])).values()];
  const next = (upcoming || []).find((s) => s.status === "confirmed");
  const latestGuide = progress?.find((g) => g.last_chapter_slug);
  const guideUrl = latestGuide && `${HOME_URL}/counselling/guides/${encodeURIComponent(latestGuide.guide_slug)}?chapter=${encodeURIComponent(latestGuide.last_chapter_slug)}`;
  const guideCount = (progress || []).filter((g) => g.has_read).length;
  const name = profile?.display_name || user?.full_name || user?.username || "Student";
  const classLabel = intake?.learner?.current_class ? `Class ${intake.learner.current_class}` : "";
  const stream = intake?.learner?.stream || "";

  return <div className="mc-home">
    <div className="mc-home-hero mc-card">
      <span className="mc-avatar">{name[0]}</span>
      <div className="mc-card-main"><h1>Welcome, {name}</h1>
        {(classLabel || stream) && <p>{[classLabel, stream].filter(Boolean).join(" · ")}</p>}
      </div>
      <a className="mc-btn" href={bookUrl}>Book a session</a>
      <Link className="mc-btn mc-btn--outline" to="/profile">Edit your profile</Link>
    </div>

    <div className="mc-home-stats">
      {[["Sessions booked", bookedCount], ["Completed", completed.length],
        ["Counsellors met", [...new Set(completed.map((s) => s.counselor?.id).filter(Boolean))].length],
        ["Guides read", progress === null ? "…" : guideCount]].map(([label, value]) =>
        <div className="mc-card mc-home-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </div>

    <div className="mc-home-grid">
      <section className="mc-card mc-home-panel">
        <h2>Next session</h2>
        {next ? <>
          <div className="mc-home-person"><span className="mc-avatar">{(next.counselor?.display_name || "?")[0]}</span>
            <div><strong>{next.counselor?.display_name}</strong><p>{fmtWhen(next.scheduled_at)}</p></div></div>
          {next.student_note && <p className="mc-note">{next.student_note}</p>}
          <div className="mc-actions">
            {next.meeting_link ? <a className="mc-btn" href={next.meeting_link} target="_blank" rel="noreferrer">Join session</a> :
              <span className="mc-btn mc-btn--disabled">Meeting link coming soon</span>}
            <Link className="mc-btn mc-btn--outline" to="/counseling/appointments">View all sessions</Link>
          </div>
          <p className="mc-home-hint">Assessment results are shared with your counsellor before the session.</p>
        </> : <><p>No confirmed session is coming up.</p><a className="mc-btn" href={bookUrl}>Find a counsellor →</a></>}
      </section>
      <section className="mc-card mc-home-panel">
        <h2>My counsellors</h2>
        {counsellors.length ? counsellors.map((c) => <div className="mc-home-person" key={c.id}>
          <span className="mc-avatar">{(c.display_name || "?")[0]}</span>
          <div><strong>{c.display_name}</strong><p>{c.qualifications || "Career counsellor"}</p></div>
        </div>) : <p>Counsellors appear here once you book a session.</p>}
        <a className="mc-btn mc-btn--outline" href={bookUrl}>Find counsellors →</a>
      </section>
    </div>

    {latestGuide && <section className="mc-card mc-home-panel mc-continue">
      <h2>Continue reading</h2>
      <p><strong>{latestGuide.guide_title}</strong> · {latestGuide.last_chapter_title}</p>
      <a className="mc-btn mc-btn--outline" href={guideUrl}>Resume →</a>
    </section>}

    <section className="mc-home-journey">
      <h2>Keep moving forward</h2>
      <div className="mc-home-stats">
        {[["Spark Finder", "A quick way to notice what excites you", "/counselling/spark"],
          ["Profile Wizard", "Build a clearer picture of your goals", "/counselling/profile"],
          ["Career Report", "Review your directions and next steps", "/counselling/path"]].map(([title, body, path]) =>
          <a className="mc-card mc-journey-card" href={`${HOME_URL}${path}`} key={title}>
            <strong>{title}</strong><span>{body}</span><b>Open →</b>
          </a>)}
      </div>
    </section>
  </div>;
}
