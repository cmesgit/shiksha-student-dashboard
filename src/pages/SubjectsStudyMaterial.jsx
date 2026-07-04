import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import SubjectCard from "../components/SubjectCard";
import PageHeader from "../components/PageHeader";
import api from "../api/apiClient";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/subjects.css";

export default function SubjectsStudyMaterial() {

  const navigate = useNavigate();
  const { activeCourse } = useCourse();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourceCounts, setResourceCounts] = useState({});
  const [resourceCountsReady, setResourceCountsReady] = useState(false);
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
    "3b: social science - geography (resources and development)": "/images/geography.jpeg",
    "3c: social science - civics (social and political life iii)": "/images/Civics.jpg",

    "3a: social science - history": "/images/history.jpeg",
    "3b: social science - geography": "/images/geography.jpg",
    "3c: social science - civics": "/images/Civics.jpg",
    "3d: social science - economics": "/images/eco.jpeg",

    "history": "/images/history.jpeg",
    "geography (india)": "/images/geography.jpg",
    "geography (india - physical, social and economic)": "/images/geography.jpg",
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

    if (!activeCourse) { setLoading(false); return; }

    setLoading(true);
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/courses/${activeCourse.id}/subjects/`);
        setSubjects(res.data);
      } catch (err) {
        console.error("Failed to load subjects", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();

  }, [activeCourse]);

  useEffect(() => {
    if (subjects.length === 0) return;

    async function fetchResourceCounts() {
      const results = await Promise.allSettled(
        subjects.map(async (subject) => {
          const res = await api.get(`/materials/subjects/${subject.id}/materials/`);
          return { id: subject.id, count: (res.data || []).length };
        })
      );
      const counts = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          counts[result.value.id] = result.value.count;
        }
      });
      setResourceCounts(counts);
      setResourceCountsReady(true);
    }

    fetchResourceCounts();
  }, [subjects]);

  const handleSubjectClick = (id) => {
    navigate(`/study-material/list/${id}`);
  };

  return (
    <div className="subjectsPage">

      <div className="subjectsHeaderBox">
        <PageHeader title="Study Material" />
      </div>

      <div className="subjectsBodyBox">
        {loading ? (
          <LoadingState label="Loading study material" />
        ) : !activeCourse ? (
          <EmptyState
            plain
            icon="file"
            title="No course selected"
            message="Enrol in a course to see its study material."
            action={{ label: "Browse courses", to: "/browse-courses", icon: "search" }}
          />
        ) : subjects.length === 0 ? (
          <EmptyState
            plain
            icon="file"
            title="No study material yet"
            message="Notes, PDFs, and resources will appear here, grouped by subject, once your teachers add them."
          />
        ) : (
        <div className="subjectsGrid">

         {subjects.map((item) => (
    <SubjectCard
      key={item.id}
      id={item.id}
      subject={item.name}
      teacher={
        item.teachers?.length
          ? item.teachers.map(t => t.name).join(", ")
          : "No teacher assigned"
      }
      img={getSubjectImage(item.name)}
      taskCount={resourceCountsReady ? (resourceCounts[item.id] ?? 0) : undefined}
      taskLabel="Resource"
      onClick={() => handleSubjectClick(item.id)}
    />
))}

        </div>
        )}
      </div>

    </div>
  );
}