import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import RenewSubscriptionModal from "../components/RenewSubscriptionModal";
import "../styles/myCourseDetail.css";

const DATE_FORMAT = { day: "2-digit", month: "short", year: "numeric" };

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", DATE_FORMAT);
}

export default function MyCourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, loading } = useCourse();

  const [renewOpen, setRenewOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const course = useMemo(
    () => courses?.find((c) => c.id === courseId),
    [courses, courseId]
  );

  if (loading) {
    return <div className="myCourseDetail__loading">Loading...</div>;
  }

  if (!course) {
    return (
      <div className="myCourseDetail__notFound">
        <p>Course not found or you're not enrolled.</p>
        <button className="myCourseDetail__backBtn" onClick={() => navigate("/")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const sub = course.subscription;
  const board = course.board?.name;
  const stream = course.stream_name;

  return (
    <div className="myCourseDetail">
      <section className="myCourseDetail__header">
        <div className="myCourseDetail__headerMain">
          <h1 className="myCourseDetail__title">{course.title}</h1>
          <div className="myCourseDetail__meta">
            {board && <span className="myCourseDetail__chip">{board}</span>}
            {stream && <span className="myCourseDetail__chip">{stream}</span>}
          </div>
          {course.description && (
            <p className="myCourseDetail__desc">{course.description}</p>
          )}
        </div>

        <div className="myCourseDetail__subscription">
          {sub ? (
            <>
              <span
                className={`myCourseDetail__statusBadge ${
                  sub.is_trial && sub.is_active
                    ? "myCourseDetail__statusBadge--trial"
                    : sub.is_active
                      ? "myCourseDetail__statusBadge--active"
                      : "myCourseDetail__statusBadge--expired"
                }`}
              >
                {sub.is_trial && sub.is_active
                  ? "Free trial"
                  : sub.is_active
                    ? "Active"
                    : sub.is_trial
                      ? "Trial ended"
                      : "Expired"}
              </span>

              <div className="myCourseDetail__daysRemaining">
                {sub.is_active ? (
                  <>
                    <span className="myCourseDetail__daysNum">
                      {sub.days_remaining}
                    </span>
                    <span className="myCourseDetail__daysLabel">
                      day{sub.days_remaining === 1 ? "" : "s"} remaining
                    </span>
                  </>
                ) : (
                  <span className="myCourseDetail__daysLabel">
                    {sub.is_trial ? "Your trial has ended" : "Subscription expired"}
                  </span>
                )}
              </div>

              <p className="myCourseDetail__expires">
                {sub.is_active ? "Expires" : "Expired"} on{" "}
                <strong>{formatDate(sub.expires_at)}</strong>
              </p>

              {justSubmitted ? (
                <p className="myCourseDetail__pendingNote">
                  Renewal submitted — awaiting approval.
                </p>
              ) : (
                <button
                  type="button"
                  className="myCourseDetail__renewBtn"
                  onClick={() => setRenewOpen(true)}
                >
                  {sub.is_trial && sub.is_active
                    ? "Upgrade to full access"
                    : sub.is_active
                      ? "Renew / Extend"
                      : sub.is_trial
                        ? "Enroll to continue"
                        : "Renew Subscription"}
                </button>
              )}
            </>
          ) : (
            <>
              <span className="myCourseDetail__statusBadge myCourseDetail__statusBadge--legacy">
                Legacy access
              </span>
              <p className="myCourseDetail__legacyNote">
                Subscription tracking not yet enabled for this enrollment.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="myCourseDetail__placeholderGrid">
        <PlaceholderCard title="Progress" message="Coming soon" />
        <PlaceholderCard title="Teachers" message="Coming soon" />
        <PaymentHistoryCard history={course.payment_history} />
      </section>

      {renewOpen && (
        <RenewSubscriptionModal
          course={course}
          onClose={() => setRenewOpen(false)}
          onSubmitted={() => {
            setRenewOpen(false);
            setJustSubmitted(true);
          }}
        />
      )}
    </div>
  );
}

function PlaceholderCard({ title, message }) {
  return (
    <div className="myCourseDetail__placeholder">
      <h3 className="myCourseDetail__placeholderTitle">{title}</h3>
      <p className="myCourseDetail__placeholderMsg">{message}</p>
    </div>
  );
}

function PaymentHistoryCard({ history }) {
  if (!history || history.length === 0) {
    return <PlaceholderCard title="Payment History" message="No payments yet" />;
  }

  return (
    <div className="myCourseDetail__placeholder myCourseDetail__historyCard">
      <h3 className="myCourseDetail__placeholderTitle">Payment History</h3>
      <ul className="myCourseDetail__historyList">
        {history.map((p) => (
          <PaymentHistoryItem key={p.id} payment={p} />
        ))}
      </ul>
    </div>
  );
}

function PaymentHistoryItem({ payment }) {
  const rupees = (payment.amount_paid / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  const statusClass = `myCourseDetail__historyStatus--${payment.status.toLowerCase()}`;
  const statusLabel =
    payment.status === "APPROVED"
      ? "Approved"
      : payment.status === "PENDING"
        ? "Pending"
        : "Rejected";

  return (
    <li className="myCourseDetail__historyItem">
      <div className="myCourseDetail__historyTop">
        <span className="myCourseDetail__historyAmount">₹{rupees}</span>
        <span
          className={`myCourseDetail__historyStatus ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="myCourseDetail__historyMeta">
        <span>{formatDate(payment.payment_date)}</span>
        <span>·</span>
        <span>{payment.payment_method}</span>
        <span>·</span>
        <span className="myCourseDetail__historyUtr">{payment.utr_number}</span>
      </div>
    </li>
  );
}
