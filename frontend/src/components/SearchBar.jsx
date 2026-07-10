// src/components/SearchBar.jsx
import { useState, useEffect } from "react";

export default function SearchBar({ placeholder = "Search...", onSearch, delay = 400 }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="input-group">
      <span className="input-group-text bg-white border-end-0">
        <i className="bi bi-search text-muted"></i>
      </span>
      <input
        type="text"
        className="form-control border-start-0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}