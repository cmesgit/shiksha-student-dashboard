import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api/apiClient";
import SubjectCard from "../components/SubjectCard";
import PageHeader from "../components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/subjects.css";

export default function SubjectsQuiz() {
  const navigate = useNavigate();

  const [subjectData, setSubjectData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizCounts, setQuizCounts] = useState({});
  const [quizCountsReady, setQuizCountsReady] = useState(false);

 const subjectImages = {
  "science": "/images/sci.jpeg",
  "mathematics": "/images/Math.png",

  "english (it so happened)": "/images/eng.jpeg",
  "english (grammar)": "/images/eng.jpeg",
  "english (honeydew)": "/images/eng.jpeg",
  "english (hornbill)": "/images/eng.jpeg",
  "english (vistas)": "/images/eng.jpeg",
  "english (flamingo)": "/images/eng.jpeg",
  "english (first flight)": "/images/eng.jpeg",
  "english (footprints without feet)": "/images/eng.jpeg",
  "english (snapshots)": "/images/eng.jpeg",

  "4a: english - honeydew (main reader)": "/images/eng.jpeg",
  "4a: english - main reader (beehive)": "/images/eng.jpeg",
  "4b: english - it so happened (supplementary reader)": "/images/eng.jpeg",
  "4b: english - supplementary (moments)": "/images/eng.jpeg",
  "4a: english - main reader (first flight)": "/images/eng.jpeg",
  "4b: english - supplementary (footprints without feet)": "/images/eng.jpeg",
 "4c: english - grammar & writing skills": "/images/eng.jpeg",

  "hindi - vasant iii + grammar (mil)": "/images/hindi.png",
  "hindi (aroh i)": "/images/hindi.png",
  "hindi (aroh ii)": "/images/hindi.png",
  "hindi (kishtiji ii)": "/images/hindi.png",
  "hindi (kritika ii)": "/images/hindi.png",
  "hindi (vitan i)": "/images/hindi.png",
  "hindi (vitan ii)": "/images/hindi.png",
  "hindi (grammar)": "/images/hindi.png",

  "social science (civics)": "/images/Civics.jpg",
  "social science (history)": "/images/history.jpeg",
  "social science (geography)": "/images/geography.jpg",
  "social science (economics)": "/images/eco.jpeg",

  "3a: social science - history (our pasts iii)": "/images/history.jpeg",
  "3b: social science - geography (resources and development)": "/images/geography.jpg",
  "3c: social science - civics (social and political life iii)": "/images/Civics.jpg",

  "3a: social science - history": "/images/history.jpeg",
  "3b: social science - geography": "/images/geography.jpg",
  "3c: social science - civics": "/images/Civics.jpg",
  "3d: social science - economics": "/images/eco.jpeg",

  "history": "/images/history.jpeg",
  "geography (india)": "/images/geography.jpg",
  "geography (india - physical, social and economic)": "/images/history.jpeg",
  "geography (physical)": "/images/history.jpeg",
  "geography (human)": "/images/geography.jpg",

  "economics": "/images/eco.jpeg",
  "economics (indian economic development)": "/images/eco.jpeg",
  "economics (microeconomics)": "/images/eco.jpeg",

  "political science (indian constitution)": "/images/polSci.jpeg",
  "political science (political theory)": "/images/polSci.jpeg",
  "political science (indian since independence)": "/images/polSci.jpeg",
  "political science (contemporary world)": "/images/polSci.jpeg",

  "accountancy": "/images/accountancy.jpeg",
  "business studies": "/images/business study.jpeg",

  "chemistry": "/images/chem.jpeg",
  "physics": "/images/phys.jpeg",
  "biology": "/images/bio.jpeg",

  "sociology": "/images/sociology.jpeg",
};

  function clean(text) {
  return text
    ?.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "") || "";
}

function getSubjectImage(subjectName) {
  const normalized = clean(subjectName);

  const sortedKeys = Object.keys(subjectImages).sort(
    (a, b) => b.length - a.length
  );

  const matchedKey = sortedKeys.find((key) =>
    normalized.includes(clean(key))
  );

  return matchedKey ? subjectImages[matchedKey] : "/images/default.png";
}

  useEffect(() => {
    async function fetchSubjects() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/student/quiz-subjects/");
        setSubjectData(res.data);
      } catch (err) {
        console.error("Failed to fetch quiz subjects:", err);
        setError("Failed to load quiz subjects.");
        setSubjectData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  useEffect(() => {
    if (subjectData.length === 0) return;

    async function fetchQuizCounts() {
      const results = await Promise.allSettled(
        subjectData.map(async (item) => {
          const res = await api.get("/student/quizzes/", { params: { subject: item.id } });
          const quizzes = res.data || [];
          const pending = quizzes.filter((q) => q.status !== "SUBMITTED" && !(q.attempts_count > 0)).length;
          const completed = quizzes.filter((q) => q.status === "SUBMITTED" || q.attempts_count > 0).length;
          return { id: item.id, pending, completed };
        })
      );
      const counts = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          counts[result.value.id] = { pending: result.value.pending, completed: result.value.completed };
        }
      });
      setQuizCounts(counts);
      setQuizCountsReady(true);
    }

    fetchQuizCounts();
  }, [subjectData]);

  if (loading) return <LoadingState label="Loading quizzes" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="subjectsPage">
      <div className="subjectsHeaderBox">
        <PageHeader title="Quiz" />
      </div>

      <div className="subjectsBodyBox">
        <div className="subjectsGrid">
          {subjectData.length === 0 ? (
            <EmptyState
              plain
              icon="quiz"
              title="No quizzes yet"
              message="When your teachers add quizzes, the subjects will show up here."
            />
          ) : (
            subjectData.map((item) => (
              <SubjectCard
                key={item.id}
                img={getSubjectImage(item.subject)}
                subject={item.subject}
                teacher={item.teacher}
                pendingCount={quizCountsReady ? (quizCounts[item.id]?.pending ?? 0) : undefined}
                completedCount={quizCountsReady ? (quizCounts[item.id]?.completed ?? 0) : undefined}
                onClick={() => navigate(`/subjects/quiz/${item.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}