import { useState } from "react";
import "../styles/pageHeader.css";

export default function PageHeader({ title, onSearch }) {
  const [term, setTerm] = useState("");

  const handleChange = (e) => {
    setTerm(e.target.value);
    onSearch(e.target.value);
  };

  const handleSubmit = () => {
    onSearch(term);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="pageHeader">
      <h2 className="pageHeaderTitle">{title}</h2>

      {onSearch && (
        <div className="pageHeaderSearch">
          <input
            placeholder="Search..."
            value={term}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          <button
            className="pageHeaderSearchIcon"
            onClick={handleSubmit}
            aria-label="Search"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
