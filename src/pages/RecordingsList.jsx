import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RecordingCard from "../components/RecordingCard";
import PageHeader from "../components/PageHeader";
import api from "../api/apiClient";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/recordings.css";

export default function RecordingsList() {
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [recordingsData, setRecordingsData] = useState([]);
  const [progressMap, setProgressMap]       = useState({});
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    if (!subjectId) return;

    const fetchAll = async () => {
      try {
        const res = await api.get(`/courses/subjects/${subjectId}/recordings/`);
        const recordings = res.data || [];
        setRecordingsData(recordings);

        // Fetch progress for all recordings in parallel
        const progressResults = await Promise.allSettled(
          recordings.map((r) =>
            api.get(`/courses/recordings/${r.id}/progress/`).then((p) => ({
              id: r.id,
              ...p.data,
            }))
          )
        );

        const map = {};
        progressResults.forEach((result) => {
          if (result.status === "fulfilled") {
            map[result.value.id] = result.value;
          }
        });
        setProgressMap(map);

      } catch (err) {
        console.error("Failed to load recordings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [subjectId]);


  return (
    <div className="recordingsPage">
      <button className="recordingsBack" onClick={() => navigate(-1)}>
        &lt; Back
      </button>

      <div className="recordingsHeaderBox">
        <PageHeader title="Subject Recordings" />
      </div>

      <div className="recordingsBodyBox">

        {loading && <LoadingState plain label="Loading recordings" />}

        {!loading && recordingsData.length === 0 && (
          <EmptyState
            plain
            icon="video"
            title="No recordings yet"
            message="Once your teacher uploads a recorded class for this subject, it'll appear here."
          />
        )}

        <div className="recordingsGrid">
          {recordingsData.map((item) => {
            const prog = progressMap[item.id];
            const pct  = prog?.percent_complete ?? null;
            const done = prog?.completed ?? false;

            return (
              <div key={item.id} className="recordingCardWrapper">
                <RecordingCard
                  subject="Session"
                  sessionTitle={item.title}
                  teacher={item.uploaded_by_name || "Teacher"}
                  sessionDate={item.session_date}
                  thumbnail={item.thumbnail_url}
                  onClick={() =>
                    navigate(`/subjects/recordings/${subjectId}/video/${item.id}`)
                  }
                />

                {pct !== null && (
                  <div className="recordingCardProgress">
                    <div className="recordingCardProgressBar">
                      <div
                        className="recordingCardProgressFill"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: done ? "#16a34a" : "#2563eb",
                        }}
                      />
                    </div>
                    <span className="recordingCardProgressLabel">
                      {done ? "✓ Completed" : `${pct}%`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}