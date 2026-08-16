import { useState } from "react";
import api from "../api/apiClient";
import { useAuth } from "../contexts/AuthContext";
import "../styles/renewSubscriptionModal.css";

export default function RenewSubscriptionModal({ course, onClose, onSubmitted }) {
  const { activeProfile } = useAuth();
  const defaultAmount = course?.price ? String(course.price / 100) : "";

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [utr, setUtr] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState(defaultAmount);
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    utr.trim() &&
    paymentDate &&
    amount &&
    receipt &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const fd = new FormData();
    fd.append("course", course.id);
    fd.append("payment_method", paymentMethod);
    fd.append("utr_number", utr.trim());
    fd.append("payment_date", paymentDate);
    fd.append("amount_paid", String(Math.round(parseFloat(amount) * 100)));
    fd.append("receipt", receipt);
    if (activeProfile?.id) fd.append("active_profile_id", activeProfile.id);

    try {
      await api.post("/enrollments/requests/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSubmitted?.();
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
          <h2>Renew {course.title}</h2>
          <button
            type="button"
            className="renewModal__closeBtn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="renewModal__intro">
          Pay via UPI or bank transfer using the same details from your original enrollment,
          then fill in the payment proof below. Approval is usually within 24 hours.
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
              {submitting ? "Submitting..." : "Submit Renewal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
