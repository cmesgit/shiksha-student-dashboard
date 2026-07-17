import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState } from "../components/StateViews";
import "../styles/private-details.css";

const GENDER_OPTIONS = ["male", "female", "other"];
const STUDYING_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const CLASS_OPTIONS = ["8", "9", "10", "11", "12"];
const STREAM_OPTIONS = ["science", "commerce", "arts"];
const BOARD_OPTIONS = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE" },
  { value: "mbse", label: "Mizoram Board of School Education" },
  { value: "nios", label: "NIOS" },
  { value: "other", label: "Other State Board" },
];
const HIGHEST_EDU_OPTIONS = [
  { value: "below_8", label: "Below Class 8" },
  { value: "8", label: "Class 8" },
  { value: "9", label: "Class 9" },
  { value: "10", label: "Class 10" },
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
];

function Field({ label, value, editNode, isEditing }) {
  return (
    <div className="pd-field">
      <div className="pd-label">{label}</div>
      {isEditing && editNode ? editNode : (
        <div className={`pd-value ${!value ? "pd-value--muted" : ""}`}>{value || "—"}</div>
      )}
    </div>
  );
}

function formatDob(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export default function PrivateDetails() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({});

  useEffect(() => {
    api
      .get("/accounts/student/profile/")
      .then((res) => {
        setProfile(res.data);
        setForm(res.data);
      })
      .catch((err) => setError(err?.response?.data?.detail || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      const editableFields = [
        "first_name", "last_name", "phone", "gender", "date_of_birth",
        "state", "district", "city_town", "pin_code",
        "father_name", "father_phone",
        "mother_name", "mother_phone",
        "guardian_name", "guardian_phone", "parent_guardian_email",
        "currently_studying", "current_class", "stream", "board", "board_other",
        "school_name", "academic_year",
        "highest_education", "reason_not_studying",
      ];
      for (const k of editableFields) {
        if (form[k] !== undefined) payload[k] = form[k] ?? "";
      }
      const res = await api.patch("/accounts/student/profile/", payload);
      setProfile(res.data);
      setForm(res.data);
      setIsEditing(false);
    } catch (err) {
      alert(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(profile);
    setIsEditing(false);
  };

  if (loading) return <LoadingState label="Loading" />;
  if (error) return <div className="pd-error">{error}</div>;
  if (!profile) return null;

  return (
    <div className="pd-page">
      <div className="pd-header">
        <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Private Details</h1>
        {!isEditing ? (
          <button className="pd-edit-btn" onClick={() => setIsEditing(true)}>Edit</button>
        ) : (
          <div className="pd-actions">
            <button className="pd-cancel-btn" onClick={handleCancel} disabled={saving}>Cancel</button>
            <button className="pd-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <section className="pd-section">
        <h2>Basic Details</h2>
        <div className="pd-grid">
          <Field isEditing={isEditing} label="First Name" value={profile.first_name}
            editNode={<input className="pd-input" value={form.first_name || ""} onChange={set("first_name")} />} />
          <Field isEditing={isEditing} label="Last Name" value={profile.last_name}
            editNode={<input className="pd-input" value={form.last_name || ""} onChange={set("last_name")} />} />
          <Field isEditing={isEditing} label="Email" value={profile.email} />
          <Field isEditing={isEditing} label="Phone" value={profile.phone}
            editNode={<input className="pd-input" value={form.phone || ""} onChange={set("phone")} />} />
          <Field isEditing={isEditing} label="Date of Birth" value={formatDob(profile.date_of_birth)}
            editNode={<input type="date" className="pd-input" value={form.date_of_birth || ""} onChange={set("date_of_birth")} />} />
          <Field isEditing={isEditing} label="Gender" value={profile.gender}
            editNode={
              <select className="pd-input" value={form.gender || ""} onChange={set("gender")}>
                <option value="">Select</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            } />
          <Field isEditing={isEditing} label="Student ID" value={profile.student_id} />
        </div>
      </section>

      <section className="pd-section">
        <h2>Address</h2>
        <div className="pd-grid">
          <Field isEditing={isEditing} label="State" value={profile.state}
            editNode={<input className="pd-input" value={form.state || ""} onChange={set("state")} />} />
          <Field isEditing={isEditing} label="District" value={profile.district}
            editNode={<input className="pd-input" value={form.district || ""} onChange={set("district")} />} />
          <Field isEditing={isEditing} label="City/Town" value={profile.city_town}
            editNode={<input className="pd-input" value={form.city_town || ""} onChange={set("city_town")} />} />
          <Field isEditing={isEditing} label="Pin Code" value={profile.pin_code}
            editNode={<input className="pd-input" value={form.pin_code || ""} onChange={set("pin_code")} />} />
        </div>
      </section>

      <section className="pd-section">
        <h2>Parent / Guardian</h2>
        <div className="pd-grid">
          <Field isEditing={isEditing} label="Father's Name" value={profile.father_name}
            editNode={<input className="pd-input" value={form.father_name || ""} onChange={set("father_name")} />} />
          <Field isEditing={isEditing} label="Father's Phone" value={profile.father_phone}
            editNode={<input className="pd-input" value={form.father_phone || ""} onChange={set("father_phone")} />} />
          <Field isEditing={isEditing} label="Mother's Name" value={profile.mother_name}
            editNode={<input className="pd-input" value={form.mother_name || ""} onChange={set("mother_name")} />} />
          <Field isEditing={isEditing} label="Mother's Phone" value={profile.mother_phone}
            editNode={<input className="pd-input" value={form.mother_phone || ""} onChange={set("mother_phone")} />} />
          <Field isEditing={isEditing} label="Guardian's Name" value={profile.guardian_name}
            editNode={<input className="pd-input" value={form.guardian_name || ""} onChange={set("guardian_name")} />} />
          <Field isEditing={isEditing} label="Guardian's Phone" value={profile.guardian_phone}
            editNode={<input className="pd-input" value={form.guardian_phone || ""} onChange={set("guardian_phone")} />} />
          <Field isEditing={isEditing} label="Parent/Guardian Email" value={profile.parent_guardian_email}
            editNode={<input type="email" className="pd-input" value={form.parent_guardian_email || ""} onChange={set("parent_guardian_email")} />} />
        </div>
      </section>

      <section className="pd-section">
        <h2>Academic Information</h2>
        <div className="pd-grid">
          <Field isEditing={isEditing} label="Currently Studying" value={profile.currently_studying}
            editNode={
              <select className="pd-input" value={form.currently_studying || ""} onChange={set("currently_studying")}>
                <option value="">Select</option>
                {STUDYING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            } />
          {(form.currently_studying || profile.currently_studying) === "yes" && (
            <>
              <Field isEditing={isEditing} label="Current Class" value={profile.current_class}
                editNode={
                  <select className="pd-input" value={form.current_class || ""} onChange={set("current_class")}>
                    <option value="">Select</option>
                    {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                } />
              <Field isEditing={isEditing} label="Stream" value={profile.stream}
                editNode={
                  <select className="pd-input" value={form.stream || ""} onChange={set("stream")}>
                    <option value="">Select</option>
                    {STREAM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                } />
              <Field isEditing={isEditing} label="Board" value={profile.board}
                editNode={
                  <select className="pd-input" value={form.board || ""} onChange={set("board")}>
                    <option value="">Select</option>
                    {BOARD_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                } />
              {(form.board || profile.board) === "other" && (
                <Field isEditing={isEditing} label="Board (Other)" value={profile.board_other}
                  editNode={<input className="pd-input" value={form.board_other || ""} onChange={set("board_other")} />} />
              )}
              <Field isEditing={isEditing} label="School Name" value={profile.school_name}
                editNode={<input className="pd-input" value={form.school_name || ""} onChange={set("school_name")} />} />
              <Field isEditing={isEditing} label="Academic Year" value={profile.academic_year}
                editNode={<input className="pd-input" value={form.academic_year || ""} onChange={set("academic_year")} />} />
            </>
          )}
          {(form.currently_studying || profile.currently_studying) === "no" && (
            <>
              <Field isEditing={isEditing} label="Highest Education" value={profile.highest_education}
                editNode={
                  <select className="pd-input" value={form.highest_education || ""} onChange={set("highest_education")}>
                    <option value="">Select</option>
                    {HIGHEST_EDU_OPTIONS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                } />
              <Field isEditing={isEditing} label="Reason for not studying" value={profile.reason_not_studying}
                editNode={<input className="pd-input" value={form.reason_not_studying || ""} onChange={set("reason_not_studying")} />} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
