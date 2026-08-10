import { useNavigate } from "react-router-dom";
import "../styles/assignmentPending.css";

export default function AssignmentCompletedCard({ 
  id, 
  subjectId,   // 
  title, 
  teacher, 
  completedDate 
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/subjects/${subjectId}/assignments/${id}`);
  };

  return (
    <div className="assignmentCompletedCard" onClick={handleClick}>
      <span className="assignmentCompletedCard__badge">✓</span>
      <div className="assignmentCompletedCard__top">
        <p className="assignmentCompletedCard__title">{title}</p>
      </div>
      <p className="assignmentCompletedCard__teacher">{teacher}</p>
      <div className="assignmentCompletedCard__bottom">
        <p className="assignmentCompletedCard__date">{completedDate}</p>
      </div>
    </div>
  );
}
