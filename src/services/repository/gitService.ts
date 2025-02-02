import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { CodeChange } from "@/types/code-changes";
import { ChangeDetectionService } from "../changeDetection/detector";

export interface RepositoryConfig {
  url: string;
  branch?: string;
  startCommit?: string;
  endCommit?: string;
  localPath?: string;
}

export class GitRepositoryService {
  private baseDir: string;
  private changeDetector: ChangeDetectionService;

  constructor(baseDir: string = "temp-repos") {
    this.baseDir = baseDir;
    this.changeDetector = new ChangeDetectionService();
    this.ensureBaseDirectoryExists();
  }

  private ensureBaseDirectoryExists(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getRepositoryPath(repoUrl: string): string {
    const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
    return path.join(this.baseDir, repoName);
  }

  async cloneRepository(config: RepositoryConfig): Promise<string> {
    const repoPath = config.localPath || this.getRepositoryPath(config.url);

    try {
      if (fs.existsSync(repoPath)) {
        console.log("Repository already exists, pulling latest changes...");
        execSync("git pull", { cwd: repoPath });
      } else {
        console.log("Cloning repository...");
        execSync(`git clone ${config.url} ${repoPath}`);
      }

      if (config.branch) {
        execSync(`git checkout ${config.branch}`, { cwd: repoPath });
      }

      return repoPath;
    } catch (error) {
      console.error("Failed to clone/update repository:", error);
      throw new Error("Repository operation failed");
    }
  }

  async analyzeRepositoryChanges(config: RepositoryConfig): Promise<CodeChange[]> {
    const repoPath = await this.cloneRepository(config);

    try {
      if (config.startCommit && config.endCommit) {
        // Analyze changes between specific commits
        execSync(`git checkout ${config.startCommit}`, { cwd: repoPath });
        const changes = await this.analyzeChangesInRange(repoPath, config.startCommit, config.endCommit);
        return changes;
      } else {
        // Analyze recent changes
        return await this.analyzeRecentChanges(repoPath);
      }
    } catch (error) {
      console.error("Failed to analyze repository changes:", error);
      throw new Error("Repository analysis failed");
    }
  }

  private async analyzeChangesInRange(repoPath: string, startCommit: string, endCommit: string): Promise<CodeChange[]> {
    try {
      process.chdir(repoPath);
      execSync(`git checkout ${startCommit}`);
      const diffOutput = execSync(`git diff ${startCommit}..${endCommit} --name-only`).toString();
      const changedFiles = diffOutput.split("\n").filter(Boolean);

      const changes: CodeChange[] = [];
      for (const file of changedFiles) {
        const diff = execSync(`git diff ${startCommit}..${endCommit} -- ${file}`).toString();
        changes.push({
          filePath: file,
          changeType: "modified", // We'll determine the actual type in the detector
          businessLogicImpacted: false, // This will be determined by the analyzer
          description: "",
          timestamp: new Date(),
          author: execSync(`git log -1 --format="%an" ${endCommit} -- ${file}`).toString().trim(),
          commitHash: endCommit,
          diff
        });
      }

      return changes;
    } finally {
      // Reset to original state
      execSync("git checkout main || git checkout master", { cwd: repoPath });
    }
  }

  private async analyzeRecentChanges(repoPath: string): Promise<CodeChange[]> {
    try {
      process.chdir(repoPath);
      return await this.changeDetector.getCurrentBranchChanges();
    } catch (error) {
      console.error("Failed to analyze recent changes:", error);
      throw new Error("Recent changes analysis failed");
    }
  }

  async cleanup(repoPath?: string): Promise<void> {
    if (repoPath && fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  }

  getCommitHistory(repoPath: string, limit: number = 10): Array<{ hash: string; message: string; author: string; date: string }> {
    try {
      const logOutput = execSync(
        `git log -n ${limit} --pretty=format:"%H|%s|%an|%ad" --date=short`,
        { cwd: repoPath }
      ).toString();

      return logOutput.split("\n").map(line => {
        const [hash, message, author, date] = line.split("|");
        return { hash, message, author, date };
      });
    } catch (error) {
      console.error("Failed to get commit history:", error);
      throw new Error("Failed to retrieve commit history");
    }
  }
}
