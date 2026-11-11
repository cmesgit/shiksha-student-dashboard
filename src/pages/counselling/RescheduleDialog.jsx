// PLACEMENT: src/pages/counselling/RescheduleDialog.jsx   (NEW FILE — student dashboard)
//
// Workflow §8 "Reschedule" — pick a new date, then a new slot, confirm.
//
// Slots come from the same GET /counselors/<id>/slots/ the booking flow
// uses, so the choices offered here are the counsellor's real availability
// minus what is already booked. The server re-validates on PATCH and
// answers 409 if the slot went in the meantime — that is handled rather
// than assumed away, because the picker is loaded once and a student may
// sit on it.

import React, { useEffect, useMemo, useState } from "react";
import { getSlots, rescheduleAppointment } from "../../api/counsellingService";

const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);
const fmtDay = (iso) => new Date(iso).toLocaleDateString(undefined,
  { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString(undefined,
  { hour: "numeric", minute: "2-digit" });

export default function RescheduleDialog({ appointment, onClose, onDone }) {
  const [slots, setSlots] = useState(null);
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const counselorId = appointment.counselor?.id;

  const load = () => {
    if (!counselorId) { setSlots([]); return; }
    getSlots(counselorId, 21)
      .then((d) => setSlots(d.slots || []))
      .catch(() => setSlots([]));
  };
  useEffect(() => {
    if (!counselorId) return;
    let live = true;
    getSlots(counselorId, 21)
      .then((d) => { if (live) setSlots(d.slots || []); })
      .catch(() => { if (live) setSlots([]); });
    return () => { live = false; };
  }, [counselorId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Group into days, excluding the slot the session is already on — offering
  // the current time as a "new" time is just a confusing no-op.
  const byDay = useMemo(() => {
    const out = new Map();
    (slots || []).forEach((s) => {
      if (s === appointment.scheduled_at) return;
      const k = dayKey(s);
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(s);
    });
    return out;
  }, [slots, appointment.scheduled_at]);

  const days = [...byDay.keys()].sort();

  const confirm = async () => {
    if (!slot) return;
    setBusy(true); setError("");
    try {
      const updated = await rescheduleAppointment(appointment.id, slot);
      onDone(updated);
    } catch (e) {
      if (e?.response?.status === 409) {
        setError("That slot was just taken — here are the updated times.");
        setSlot(""); setSlots(null); load();
      } else {
        setError("Couldn't reschedule — check your connection and try again.");
      }
      setBusy(false);
    }
  };

  return (
    <div className="rs-mask" onClick={onClose}>
      <div className="rs-dialog" role="dialog" aria-modal="true"
        aria-label="Reschedule session" onClick={(e) => e.stopPropagation()}>
        <div className="rs-head">
          <div>
            <h2 className="rs-title">Reschedule your session</h2>
            <p className="rs-sub">
              With {appointment.counselor?.display_name} · currently{" "}
              {fmtDay(appointment.scheduled_at)} at {fmtTime(appointment.scheduled_at)}
            </p>
          </div>
          <button className="rs-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="rs-body">
          {error && <div className="rv-error">{error}</div>}

          {slots === null ? (
            <div className="mc-skel" style={{ height: 90 }} />
          ) : days.length === 0 ? (
            <div className="mc-empty">
              No other open slots in the next three weeks. Cancel and rebook,
              or message your counsellor.
            </div>
          ) : (
            <>
              <div className="rs-label">Pick a date</div>
              <div className="rs-days">
                {days.map((d) => (
                  <button key={d} className={`rs-day${day === d ? " rs-day--on" : ""}`}
                    onClick={() => { setDay(d); setSlot(""); }}>
                    {fmtDay(byDay.get(d)[0])}
                    <em>{byDay.get(d).length} slot{byDay.get(d).length === 1 ? "" : "s"}</em>
                  </button>
                ))}
              </div>

              {day && (
                <>
                  <div className="rs-label">Pick a time</div>
                  <div className="rs-times">
                    {byDay.get(day).map((s) => (
                      <button key={s} className={`rs-time${slot === s ? " rs-time--on" : ""}`}
                        onClick={() => setSlot(s)}>
                        {fmtTime(s)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="rs-foot">
          <button className="mc-btn mc-btn--outline" onClick={onClose} disabled={busy}>
            Keep current time
          </button>
          <button className="mc-btn" disabled={!slot || busy} onClick={confirm}>
            {busy ? "Moving…" : slot ? `Move to ${fmtTime(slot)}` : "Pick a time"}
          </button>
        </div>
      </div>
    </div>
  );
}
