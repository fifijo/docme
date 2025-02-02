import React from "react";
import { CodeChange } from "@/types/code-changes";

interface ChangeListProps {
  changes: CodeChange[];
  type: "business" | "other";
}

export const ChangeList: React.FC<ChangeListProps> = ({ changes, type }) => (
  <ul className={`changes-list changes-list-${type}`}>
    {changes.map((change) => (
      <li key={change.filePath} className="change-item">
        <div className="change-header">
          <strong>{change.filePath}</strong>
          <span className={`change-type ${change.changeType}`}>
            {change.changeType}
          </span>
        </div>
        <div className="change-details">
          <p>{change.description}</p>
          <div className="change-meta">
            <span>Author: {change.author}</span>
            <span>Date: {new Date(change.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </li>
    ))}
  </ul>
);
