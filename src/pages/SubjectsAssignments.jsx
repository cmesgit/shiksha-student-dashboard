import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/apiClient";
import AssignmentPendingCard from "../components/AssignmentPendingCard";
import AssignmentCompletedCard from "../components/AssignmentCompletedCard";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/assignmentPending.css";

export default function SubjectsAssignments() {
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [activeTab, setActiveTab] = useState("pending");
  const [pendingData, setPendingData] = useState([]);
  const [completedData, setCompletedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!subjectId) return;

    async function fetchAssignments() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/assignments/subject/${subjectId}/`);

        const pending = [];
        const completed = [];

        (res.data || []).forEach((assignment) => {
          if (assignment.status === "SUBMITTED") {
            completed.push(assignment);
          } else {
            pending.push(assignment);
          }
        });

        setPendingData(pending);
        setCompletedData(completed);
      } catch (err) {
        console.error("Assignment fetch error:", err);
        setError("Failed to load assignments.");
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [subjectId]);

  if (loading) return <LoadingState label="Loading assignments" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="assignmentPage">
      <button className="assignmentBack" onClick={() => navigate(-1)}>
        &lt; Back
      </button>

      <div className="assignmentHeaderBox">
        <div className="assignmentHeaderRow">
          <h2 className="assignmentSubjectTitle">Assignments</h2>

        </div>

        <div className="assignmentTabs">
          <button
            className={`assignmentTab ${
              activeTab === "pending" ? "assignmentTab--active" : ""
            }`}
            onClick={() => setActiveTab("pending")}
          >
            Pending ({pendingData.length})
          </button>

          <button
            className={`assignmentTab ${
              activeTab === "completed" ? "assignmentTab--active" : ""
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({completedData.length})
          </button>
        </div>
      </div>

      <div className="assignmentBodyBox">
        <div className="assignmentGrid">
          {activeTab === "pending" && pendingData.length === 0 && (
            <EmptyState
              plain
              icon="file"
              title="No pending assignments"
              message="You're all caught up. New assignments will appear here when your teacher sets them."
            />
          )}

          {activeTab === "pending" &&
            pendingData
              .map((item) => (
                <AssignmentPendingCard
                  key={item.id}
                  id={item.id}
                  subjectId={subjectId}
                  title={item.title}
                  teacher={item.teacher || ""}
                  chapter={item.chapter || ""}
                  deadline={new Date(item.due_date).toLocaleDateString("en-GB")}
                />
              ))}

          {activeTab === "completed" && completedData.length === 0 && (
            <EmptyState
              plain
              icon="file"
              title="Nothing submitted yet"
              message="Assignments you complete and submit will be listed here."
            />
          )}

          {activeTab === "completed" &&
            completedData
              .map((item) => (
                <AssignmentCompletedCard
                  key={item.id}
                  id={item.id}
                  subjectId={subjectId}   // ✅ ONLY FIX ADDED
                  title={item.title}
                  teacher={item.teacher_name} // (safe optional)
                  completedDate="Submitted"
                />
              ))}
        </div>
      </div>
    </div>
  );
}