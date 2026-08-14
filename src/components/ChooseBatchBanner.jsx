// src/components/ChooseBatchBanner.jsx
// ──────────────────────────────────────────────────────────────────────────
// Prompts a student who is already enrolled in `course` but has no batch yet
// (course.batch is null, course.available_batches is non-empty — both set by
// courses/views.py's MyEnrolledCoursesView) to pick one. Covers students who
// enrolled before the course had batches configured, or skipped the picker
// at enroll time. Renders nothing once a batch is set or none are available.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useCourse } from "../contexts/CourseContext";
import { selectEnrollmentBatch } from "../api/catalog";
import BatchPickerModal from "./BatchPickerModal";
import "../styles/chooseBatchBanner.css";

export default function ChooseBatchBanner({ course }) {
  const { refreshCourses } = useCourse();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const batches = course?.available_batches;
  if (course?.batch || !Array.isArray(batches) || batches.length === 0) return null;

  const handleChoose = async (batchId) => {
    setError("");
    try {
      await selectEnrollmentBatch(course.id, batchId);
      await refreshCourses();
      setOpen(false);
    } catch (e) {
      setError(
        e?.response?.data?.batch ||
        e?.response?.data?.detail ||
        "Couldn't set your batch. Please try again."
      );
    }
  };

  return (
    <>
      <div className="chooseBatchBanner" role="status">
        <span className="chooseBatchBanner__text">
          <strong>{course.title}</strong> runs in multiple batches — choose yours to see the right schedule and due dates.
        </span>
        <button
          type="button"
          className="chooseBatchBanner__btn"
          onClick={() => setOpen(true)}
        >
          Choose batch
        </button>
      </div>
      {error && <div className="chooseBatchBanner__error">{error}</div>}
      {open && (
        <BatchPickerModal
          course={course}
          batches={batches}
          onClose={() => setOpen(false)}
          onChoose={handleChoose}
        />
      )}
    </>
  );
}
