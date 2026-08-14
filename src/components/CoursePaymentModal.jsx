// src/components/CoursePaymentModal.jsx
// ──────────────────────────────────────────────────────────────────────────
// In-dashboard purchase flow for a paid course — replaces the old redirect to
// the marketing site. Rendered by Browse Courses (and the empty-state strip)
// when the live payment mode collects money.
//
// It adapts to whatever payment mode is active (from /enrollments/payment-config/):
//
//   manual_upi  → student pays via UPI/bank, then submits UTR + receipt here.
//                 POST /enrollments/requests/ creates a PENDING request that an
//                 admin approves (access is NOT instant). We show a clear
//                 "submitted, pending approval" success state.
//
//   razorpay    → gateway stub (not wired on the backend yet). We show an
//                 honest "not available yet" panel instead of a broken button,
//                 so nothing silently fails.
//
// Reuses renewSubscriptionModal.css so there's no new styling to maintain.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import api from "../api/apiClient";
import { formatPrice } from "../api/catalog";
import "../styles/renewSubscriptionModal.css";

export default function CoursePaymentModal({ course, config, batchId, onClose, onSubmitted }) {
  const requiresManualProof = !!config?.requires_manual_proof;
  const isGatewayStub = !!config?.collects_money && !requiresManualProof;

  const defaultAmount = course?.price ? String(course.price / 100) : "";

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [utr, setUtr] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState(defaultAmount);
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit =
    utr.trim() && paymentDate && amount && receipt && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const fd = new FormData();
    fd.append("course", course.id);
    if (batchId) fd.append("batch", batchId);
    fd.append("payment_method", paymentMethod);
    fd.append("utr_number", utr.trim());
    fd.append("payment_date", paymentDate);
    fd.append("amount_paid", String(Math.round(parseFloat(amount) * 100)));
    fd.append("receipt", receipt);

    try {
      await api.post("/enrollments/requests/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDone(true);
      onSubmitted?.(course);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === "object"
          ? Object.values(err.response.data).flat().join(" ")
          : null) ||
        "Something went wrong. Please try again.";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="renewModal__backdrop" onClick={onClose}>
      <div className="renewModal" onClick={(e) => e.stopPropagation()}>
        <div className="renewModal__header">
          <h2>{done ? "Payment submitted" : `Enrol in ${course.title}`}</h2>
          <button
            type="button"
            className="renewModal__closeBtn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Success state (manual proof submitted) ── */}
        {done ? (
          <>
            <p className="renewModal__intro">
              Thanks — your payment details for <strong>{course.title}</strong> have
              been submitted. An admin will review the proof and activate your
              access, usually within 24 hours. You'll get a notification once it's
              approved, and the course will then appear under "My courses".
            </p>
            <div className="renewModal__actions">
              <button
                type="button"
                className="renewModal__btn renewModal__btn--primary"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </>
        ) : isGatewayStub ? (
          /* ── Gateway (razorpay) not wired yet ── */
          <>
            <p className="renewModal__intro">
              Online card/UPI checkout for <strong>{course.title}</strong>
              {course?.price ? ` (${formatPrice(course.price)})` : ""} isn't
              available just yet. Please contact your institution to complete
              enrolment, or check back soon.
            </p>
            <div className="renewModal__actions">
              <button
                type="button"
                className="renewModal__btn renewModal__btn--primary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          /* ── Manual UPI proof form ── */
          <>
            <p className="renewModal__intro">
              Pay {course?.price ? <strong>{formatPrice(course.price)}</strong> : "the course fee"}{" "}
              via UPI or bank transfer using your institution's payment details,
              then enter the payment proof below. Approval is usually within 24 hours.
            </p>

            <form onSubmit={handleSubmit} className="renewModal__form">
              <div className="renewModal__field">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={submitting}
                >
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div className="renewModal__field">
                <label>Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="renewModal__field">
                <label>UTR / Transaction ID *</label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="renewModal__field">
                <label>Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="renewModal__field">
                <label>Payment Receipt *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  disabled={submitting}
                  required
                />
              </div>

              {error && <p className="renewModal__error">{error}</p>}

              <div className="renewModal__actions">
                <button
                  type="button"
                  className="renewModal__btn renewModal__btn--secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="renewModal__btn renewModal__btn--primary"
                  disabled={!canSubmit}
                >
                  {submitting ? "Submitting..." : "Submit payment"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
