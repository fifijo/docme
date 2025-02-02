import { CodeChange } from "@/types/code-changes";
import * as fs from "fs";
import * as path from "path";

export interface MdxConfig {
  outputDir: string;
  templatePath?: string;
}

export class MdxDocumentationService {
  private config: MdxConfig;

  constructor(config: MdxConfig) {
    this.config = config;
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private generateFrontMatter(changes: CodeChange[]): string {
    const businessLogicChanges = changes.filter(
      (change) => change.businessLogicImpacted
    );

    return `---
title: "Code Changes Documentation - ${this.formatDate(new Date())}"
date: "${new Date().toISOString()}"
authors: [${Array.from(new Set(changes.map((c) => c.author))).join(", ")}]
tags: [
  "code-changes",
  ${businessLogicChanges.length > 0 ? '"business-logic",' : ""}
  "documentation"
]
---\n\n`;
  }

  private generateMdxContent(changes: CodeChange[]): string {
    const businessLogicChanges = changes.filter(
      (change) => change.businessLogicImpacted
    );
    const otherChanges = changes.filter((change) => !change.businessLogicImpacted);

    return `
import { CodeBlock } from '@components/CodeBlock';
import { ChangeList } from '@components/ChangeList';
import { Alert } from '@components/Alert';

# Code Changes Documentation

Documentation generated on ${new Date().toLocaleDateString()} for recent code changes.

## Summary

<Alert type="info">
  Total changes detected: ${changes.length}
  Business logic changes: ${businessLogicChanges.length}
</Alert>

## Business Logic Changes

${
  businessLogicChanges.length > 0
    ? `<ChangeList
  changes={${JSON.stringify(businessLogicChanges, null, 2)}}
  type="business"
/>`
    : "No business logic changes detected."
}

## Other Changes

${
  otherChanges.length > 0
    ? `<ChangeList
  changes={${JSON.stringify(otherChanges, null, 2)}}
  type="other"
/>`
    : "No other changes detected."
}

## Detailed Changes

${changes
  .map(
    (change) => `
### ${change.filePath}

* Type: ${change.changeType}
* Author: ${change.author}
* Impact: ${change.businessLogicImpacted ? "Business Logic" : "Other"}
* Description: ${change.description}

<CodeBlock language="diff">
{\`${change.diff.replace(/`/g, "\\`")}\`}
</CodeBlock>
`
  )
  .join("\n")}

## Components

<details>
<summary>Component Import Information</summary>

This documentation uses the following custom components:
- \`CodeBlock\`: For displaying code diffs
- \`ChangeList\`: For displaying lists of changes
- \`Alert\`: For showing status information

Ensure these components are available in your MDX setup.

Example component implementations:

\`\`\`tsx
// @components/CodeBlock.tsx
export const CodeBlock = ({ children, language }) => (
  <pre className={\`language-\${language}\`}>
    <code>{children}</code>
  </pre>
);

// @components/ChangeList.tsx
export const ChangeList = ({ changes, type }) => (
  <ul className={\`changes-list \${type}\`}>
    {changes.map(change => (
      <li key={change.filePath}>
        {change.filePath} - {change.description}
      </li>
    ))}
  </ul>
);

// @components/Alert.tsx
export const Alert = ({ children, type }) => (
  <div className={\`alert alert-\${type}\`}>
    {children}
  </div>
);
\`\`\`
</details>
`;
  }

  private generateFileName(): string {
    const timestamp = new Date()
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "");
    return `${timestamp}-code-changes.mdx`;
  }

  async documentChanges(changes: CodeChange[]): Promise<string> {
    try {
      const fileName = this.generateFileName();
      const filePath = path.join(this.config.outputDir, fileName);

      const content =
        this.generateFrontMatter(changes) + this.generateMdxContent(changes);

      fs.writeFileSync(filePath, content, "utf-8");

      // Create an index file if it doesn't exist
      this.updateIndexFile(fileName);

      return filePath;
    } catch (error) {
      console.error("Failed to generate MDX documentation:", error);
      throw new Error("Failed to generate MDX documentation");
    }
  }

  private updateIndexFile(newFileName: string): void {
    const indexPath = path.join(this.config.outputDir, "index.mdx");
    const indexContent = fs.existsSync(indexPath)
      ? fs.readFileSync(indexPath, "utf-8")
      : this.generateIndexFileContent();

    const updatedContent = this.addToIndex(indexContent, newFileName);
    fs.writeFileSync(indexPath, updatedContent, "utf-8");
  }

  private generateIndexFileContent(): string {
    return `---
title: "Code Changes Documentation Index"
---

import { DocList } from '@components/DocList';

# Code Changes Documentation

This section contains automatically generated documentation for code changes, with a focus on business logic modifications.

## Recent Changes

<DocList />
`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private addToIndex(indexContent: string, newFileName: string): string {
    // If there's a DocList component, the index will automatically pick up new files
    return indexContent;
  }
}
