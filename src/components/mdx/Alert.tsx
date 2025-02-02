import React from "react";

interface AlertProps {
  children: React.ReactNode;
  type: "info" | "warning" | "success" | "error";
}

export const Alert: React.FC<AlertProps> = ({ children, type }) => (
  <div className={`alert alert-${type}`} role="alert">
    <div className="alert-content">{children}</div>
  </div>
);
