 import { ChangeDetectionService } from "../changeDetection/detector";
import { CodeAnalyzer } from "../codeAnalysis/analyzer";
import { ConfluenceService } from "./confluence";
import { CodeChange, DocumentationConfig } from "@/types/code-changes";

export class DocumentationService {
  private changeDetector: ChangeDetectionService;
  private codeAnalyzer: CodeAnalyzer;
  private confluenceService: ConfluenceService;

  constructor(config: DocumentationConfig) {
    this.changeDetector = new ChangeDetectionService();
    this.codeAnalyzer = new CodeAnalyzer();
    this.confluenceService = new ConfluenceService(config);
  }

  private generatePageContent(changes: CodeChange[]): string {
    const businessLogicChanges = changes.filter(
      (change) => change.businessLogicImpacted
    );
    const otherChanges = changes.filter(
      (change) => !change.businessLogicImpacted
    );

    return `
      <h2>Business Logic Changes</h2>
      ${
        businessLogicChanges.length > 0
          ? this.formatChangesTable(businessLogicChanges)
          : "<p>No business logic changes detected.</p>"
      }

      <h2>Other Changes</h2>
      ${
        otherChanges.length > 0
          ? this.formatChangesTable(otherChanges)
          : "<p>No other changes detected.</p>"
      }
    `;
  }

  private formatChangesTable(changes: CodeChange[]): string {
    return `
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Type</th>
            <th>Description</th>
            <th>Author</th>
          </tr>
        </thead>
        <tbody>
          ${changes
            .map(
              (change) => `
            <tr>
              <td>${change.filePath}</td>
              <td>${change.changeType}</td>
              <td>${change.description}</td>
              <td>${change.author}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <h3>Detailed Changes</h3>
      ${changes
        .map(
          (change) => `
        <h4>${change.filePath}</h4>
        <ac:structured-macro ac:name="code">
          <ac:parameter ac:name="language">typescript</ac:parameter>
          <ac:plain-text-body>
            <![CDATA[${change.diff}]]>
          </ac:plain-text-body>
        </ac:structured-macro>
      `
        )
        .join("\n")}
    `;
  }

  async documentChanges(): Promise<string> {
    try {
      // Detect changes
      const changes = await this.changeDetector.getCurrentBranchChanges();

      // Analyze changes
      const analyzedChanges = await this.codeAnalyzer.analyzeChanges(changes);

      if (analyzedChanges.length === 0) {
        console.log("No changes to document.");
        return "No changes detected";
      }

      // Generate documentation
      const timestamp = new Date().toISOString().split("T")[0];
      const title = `Code Changes Documentation - ${timestamp}`;
      const content = this.generatePageContent(analyzedChanges);
      const labels = ["code-changes", "auto-generated"];

      if (analyzedChanges.some((change) => change.businessLogicImpacted)) {
        labels.push("business-logic");
      }

      // Create or update page in Confluence
      const pageId = await this.confluenceService.createOrUpdatePage({
        title,
        content,
        labels,
        spaceKey: this.confluenceService["config"].confluenceSpaceKey,
      });

      return pageId;
    } catch (error) {
      console.error("Failed to document changes:", error);
      throw new Error("Failed to document code changes");
    }
  }

  async generatePreview(): Promise<string> {
    const changes = await this.changeDetector.getCurrentBranchChanges();
    const analyzedChanges = await this.codeAnalyzer.analyzeChanges(changes);
    return this.generatePageContent(analyzedChanges);
  }
}
