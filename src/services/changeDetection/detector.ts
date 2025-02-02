import { Octokit } from "@octokit/rest";
import { CodeChange } from "../../types/code-changes.js";
import { execSync } from "child_process";

export class ChangeDetectionService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit();
  }

  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD')
        .toString()
        .trim();
    } catch (error: unknown) {
      console.error('Failed to get current branch:', error);
      throw new Error('Failed to get current branch');
    }
  }

  private getLastCommitHash(): string {
    try {
      return execSync('git rev-parse HEAD')
        .toString()
        .trim();
    } catch (error: unknown) {
      console.error('Failed to get last commit hash:', error);
      throw new Error('Failed to get last commit hash');
    }
  }

  private getAuthor(): string {
    try {
      return execSync('git config user.name')
        .toString()
        .trim();
    } catch (error: unknown) {
      console.error('Failed to get author name:', error);
      throw new Error('Failed to get author name');
    }
  }

  private getDiff(filePath: string): string {
    try {
      return execSync(`git diff HEAD~1 HEAD -- ${filePath}`)
        .toString()
        .trim();
    } catch (error: unknown) {
      console.error('Failed to get diff:', error);
      throw new Error(`Failed to get diff for file: ${filePath}`);
    }
  }

  private getChangedFiles(): string[] {
    try {
      const output = execSync('git diff --name-only HEAD~1 HEAD')
        .toString()
        .trim();
      return output.split('\n').filter(Boolean);
    } catch (error: unknown) {
      console.error('Failed to get changed files:', error);
      throw new Error('Failed to get changed files');
    }
  }

  private async determineChangeType(filePath: string): Promise<'added' | 'modified' | 'deleted'> {
    try {
      const status = execSync(`git status --porcelain -- ${filePath}`)
        .toString()
        .trim()
        .substring(0, 2);

      if (status.includes('A')) return 'added';
      if (status.includes('D')) return 'deleted';
      return 'modified';
    } catch (error: unknown) {
      console.error('Failed to determine change type:', error);
      return 'modified'; // Default to modified if cannot determine
    }
  }

  async detectChanges(): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];
    const changedFiles = this.getChangedFiles();
    const commitHash = this.getLastCommitHash();
    const author = this.getAuthor();

    for (const filePath of changedFiles) {
      // Skip non-typescript/javascript files
      if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) continue;

      const changeType = await this.determineChangeType(filePath);
      const diff = this.getDiff(filePath);

      changes.push({
        filePath,
        changeType,
        businessLogicImpacted: false, // This will be determined by the analyzer
        description: "", // This will be filled by the analyzer
        timestamp: new Date(),
        author,
        commitHash,
        diff
      });
    }

    return changes;
  }

  async getCurrentBranchChanges(): Promise<CodeChange[]> {
    const currentBranch = this.getCurrentBranch();
    if (currentBranch === 'main' || currentBranch === 'master') {
      return this.detectChanges();
    }

    try {
      const changes = await this.detectChanges();
      return changes;
    } catch (error: unknown) {
      console.error(`Failed to get changes for branch ${currentBranch}:`, error);
      throw new Error(`Failed to get changes for branch: ${currentBranch}`);
    }
  }
}
