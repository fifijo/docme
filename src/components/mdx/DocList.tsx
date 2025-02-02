import React, { useEffect, useState } from "react";
import fs from "fs";

interface DocMetadata {
  title: string;
  date: string;
  path: string;
  tags: string[];
}

export const DocList: React.FC = () => {
  const [docs, setDocs] = useState<DocMetadata[]>([]);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        // Get all MDX files in the docs directory (excluding index.mdx)
        const files = fs.readdirSync(".")
          .filter(file => file.endsWith(".mdx") && file !== "index.mdx");

        const docsMetadata = await Promise.all(
          files.map(async (file) => {
            const content = fs.readFileSync(file, "utf-8");
            const frontMatter = parseFrontMatter(content);
            return {
              title: Array.isArray(frontMatter.title) ? frontMatter.title.join(", ") : frontMatter.title || file,
              date: Array.isArray(frontMatter.date) ? frontMatter.date[0] : frontMatter.date || "",
              path: `/${file.replace(".mdx", "")}`,
              tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
            };
          })
        );

        // Sort by date (newest first)
        setDocs(
          docsMetadata.sort((a, b) =>
            new Date(Array.isArray(b.date) ? b.date[0] : b.date).getTime() - new Date(Array.isArray(a.date) ? a.date[0] : a.date).getTime()
          )
        );
      } catch (error) {
        console.error("Failed to load documentation files:", error);
      }
    };

    loadDocs();
  }, []);

  return (
    <div className="doc-list">
      {docs.map((doc) => (
        <div key={doc.path} className="doc-item">
          <h3>
            <a href={doc.path}>{doc.title}</a>
          </h3>
          <div className="doc-meta">
            <span className="doc-date">
              {new Date(doc.date).toLocaleDateString()}
            </span>
            <div className="doc-tags">
              {doc.tags.map((tag) => (
                <span key={tag} className="doc-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

function parseFrontMatter(content: string): Record<string, string | string[]> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontMatter = match[1];
  const parsed: Record<string, string | string[]> = {};

  frontMatter.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length) {
      const value = valueParts.join(":").trim();
      if (key.includes("tags")) {
        // Parse tags array
        parsed[key.trim()] = value
          .replace(/[\[\]]/g, "")
          .split(",")
          .map((tag) => tag.trim().replace(/"/g, ""));
      } else {
        // Parse other values
        parsed[key.trim()] = value.replace(/"/g, "");
      }
    }
  });

  return parsed;
}
