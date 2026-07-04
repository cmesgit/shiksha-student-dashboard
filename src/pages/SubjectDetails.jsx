import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api/apiClient";
import PageHeader from "../components/PageHeader";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/subjectDetails.css";

export default function SubjectDetails() {
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [subjectDetails, setSubjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjectDetails() {
      try {
        const res = await api.get(`/courses/subjects/${subjectId}/dashboard/`);
        setSubjectDetails(res.data);
      } catch (err) {
        console.error("Failed to load subject details", err);
        setSubjectDetails(null);
      } finally {
        setLoading(false);
      }
    }

    if (subjectId) fetchSubjectDetails();
  }, [subjectId]);

  if (loading) return <div className="subjectDetailsPage"><LoadingState label="Loading subject" /></div>;
  if (!subjectDetails)
    return (
      <div className="subjectDetailsPage">
        <EmptyState
          icon="book"
          title="Subject not found"
          message="This subject may have been removed, or the link is out of date."
          action={{ label: "Back to subjects", to: "/subjects" }}
        />
      </div>
    );

  const teachers = subjectDetails.teachers || [];
  const primaryTeacher = teachers[0];

  return (
    <div className="subjectDetailsPage">
      <button className="subjectDetailsBack" onClick={() => navigate(-1)}>
        &lt; Back
      </button>

      <div className="subjectDetailsHeaderBox">
        <PageHeader title={subjectDetails.name} />
      </div>

      <div className="subjectDetailsBodyBox">

        {/* MAIN GRID: Teacher card + Recordings mini stat */}
        <div className="topGrid">
          {primaryTeacher && (
            <div className="teacherDetailsCard">
              <div className="teacherLeft">
                <h3 className="teacherName">{primaryTeacher.name}</h3>

                <div className="teacherInfoGrid">
                  <div className="teacherInfoRow">
                    <span className="label">Role:</span>
                    <span className="value">{primaryTeacher.display_role || "—"}</span>
                  </div>
                  <div className="teacherInfoRow">
                    <span className="label">Qualification:</span>
                    <span className="value">{primaryTeacher.qualification || "—"}</span>
                  </div>
                  <div className="teacherInfoRow">
                    <span className="label">Rating:</span>
                    <span className="value">{primaryTeacher.rating ?? "—"}</span>
                  </div>
                  <div className="teacherInfoRow">
                    <span className="label">About:</span>
                    <span className="value">{primaryTeacher.bio || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="teacherRight">
                <img
                  src={primaryTeacher.photo || "/default-teacher.png"}
                  alt={primaryTeacher.name}
                  className="teacherPhoto"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          <div
            className="miniStatCard"
            onClick={() => navigate(`/subjects/recordings/${subjectId}`)}
            style={{ cursor: "pointer" }}
          >
            <h3 className="miniStatTitle">Session Recordings</h3>
            <div className="miniStatNumber">{subjectDetails.recordings_count ?? "—"}</div>
            <div className="miniStatText">Recordings</div>
          </div>
        </div>

        {/* Study Materials mini stat */}
        <div className="secondGrid">
          <div className="liveSessionsCard">
            <h3 className="cardTitleMain">Upcoming Live Sessions</h3>
            {subjectDetails.upcomingSessions?.length > 0 ? (
              subjectDetails.upcomingSessions.map((session) => (
                <div key={session.id} className="sessionItem" onClick={() => navigate(`/live/${session.id}`)}>
                  <span className="sessionItemTitle">{session.title}</span>
                  <span className="sessionItemTime">
                    {new Date(session.start_time).toLocaleString()}
                  </span>
                  <span className={`sessionBadge sessionBadge--${session.status.toLowerCase()}`}>
                    {session.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="sessionItemText">No upcoming sessions for this subject.</p>
            )}
          </div>

          <div
            className="miniStatCard"
            onClick={() => navigate(`/subjects/study-material/${subjectId}`)}
            style={{ cursor: "pointer" }}
          >
            <h3 className="miniStatTitle">Study Materials</h3>
            <div className="miniStatNumber">{subjectDetails.study_materials_count ?? "—"}</div>
            <div className="miniStatText">Documents</div>
          </div>
        </div>

        {/* Bottom grid: Assignments + Quiz */}
        {subjectDetails.assignments && subjectDetails.quizzes && (
          <div className="bottomGrid">
            <div className="assignQuizCard">
              <h2 className="assignQuizCardTitle">Assignments</h2>
              <div className="metricsRow">
                <div className="metricCol" onClick={() => navigate(`/subjects/${subjectId}/assignments`)}>
                  <div className="metricNum blueBig">{subjectDetails.assignments.pending}</div>
                  <div className="metricText">Pending</div>
                </div>
                <div className="metricCol" onClick={() => navigate(`/subjects/${subjectId}/assignments`)}>
                  <div className="metricNum blueBig">{subjectDetails.assignments.completed}</div>
                  <div className="metricText">Completed</div>
                </div>
                <div className="metricCol">
                  <div className="metricNum blueBig">{subjectDetails.assignments.total}</div>
                  <div className="metricText">Total</div>
                </div>
              </div>
            </div>

            <div className="assignQuizCard">
              <h2 className="assignQuizCardTitle">Quiz</h2>
              <div className="metricsRow">
                <div className="metricCol" onClick={() => navigate(`/subjects/quiz/${subjectId}?tab=pending`)}>
                  <div className="metricNum blueBig">{subjectDetails.quizzes.pending}</div>
                  <div className="metricText">Pending</div>
                </div>
                <div className="metricCol" onClick={() => navigate(`/subjects/quiz/${subjectId}?tab=completed`)}>
                  <div className="metricNum blueBig">{subjectDetails.quizzes.completed}</div>
                  <div className="metricText">Completed</div>
                </div>
                <div className="metricCol">
                  <div className="metricNum blueBig">{subjectDetails.quizzes.total}</div>
                  <div className="metricText">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
