import React from "react";

interface CodeBlockProps {
  children: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, language = "text" }) => (
  <pre className={`language-${language}`}>
    <code>{children}</code>
  </pre>
);
