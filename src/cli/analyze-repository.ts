#!/usr/bin/env node
import { GitRepositoryService } from "../services/repository/gitService";
import { CodeAnalyzer } from "../services/codeAnalysis/analyzer";
import { DocumentationService } from "../services/documentation/documentationService";
import { MdxDocumentationService } from "../services/documentation/mdxService";
import { DocumentationConfig } from "../types/code-changes";

interface CliArgs {
  repoUrl: string;
  branch?: string;
  startCommit?: string;
  endCommit?: string;
  skipDoc?: boolean;
  outputType?: "confluence" | "mdx";
  outputDir?: string;
}

async function parseArgs(): Promise<CliArgs> {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    repoUrl: "",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--url":
        parsed.repoUrl = args[++i];
        break;
      case "--branch":
        parsed.branch = args[++i];
        break;
      case "--start-commit":
        parsed.startCommit = args[++i];
        break;
      case "--end-commit":
        parsed.endCommit = args[++i];
        break;
      case "--skip-doc":
        parsed.skipDoc = true;
        break;
      case "--output":
        parsed.outputType = args[++i] as "confluence" | "mdx";
        break;
      case "--output-dir":
        parsed.outputDir = args[++i];
        break;
    }
  }

  if (!parsed.repoUrl) {
    throw new Error("Repository URL is required (--url)");
  }

  return parsed;
}

async function main() {
  try {
    const args = await parseArgs();
    console.log("Analyzing repository:", args.repoUrl);

    // Initialize services
    const gitService = new GitRepositoryService();
    const analyzer = new CodeAnalyzer();

    // Clone and analyze repository
    console.log("Fetching repository changes...");
    const changes = await gitService.analyzeRepositoryChanges({
      url: args.repoUrl,
      branch: args.branch,
      startCommit: args.startCommit,
      endCommit: args.endCommit,
    });

    // Analyze changes for business logic impact
    console.log("Analyzing changes...");
    const analyzedChanges = await analyzer.analyzeChanges(changes);

    // Display analysis results
    console.log("\nAnalysis Results:");
    console.log("=================");
    console.log(`Total changes analyzed: ${analyzedChanges.length}`);

    interface Change {
      filePath: string;
      changeType: string;
      description: string;
      author: string;
      businessLogicImpacted: boolean;
    }

    const businessLogicChanges: Change[] = analyzedChanges.filter(
      (change: Change) => change.businessLogicImpacted
    );
    console.log(`Business logic changes detected: ${businessLogicChanges.length}`);

    // Display detailed results
    if (businessLogicChanges.length > 0) {
      console.log("\nBusiness Logic Changes:");
      businessLogicChanges.forEach((change) => {
        console.log(`\nFile: ${change.filePath}`);
        console.log(`Type: ${change.changeType}`);
        console.log(`Description: ${change.description}`);
        console.log(`Author: ${change.author}`);
        console.log("----------------------------------------");
      });
    }

    // Create documentation if not skipped
    if (!args.skipDoc) {
      if (args.outputType === "mdx") {
        if (!args.outputDir) {
          console.log("\nError: --output-dir is required for MDX output");
          process.exit(1);
        }

        console.log("\nGenerating MDX documentation...");
        const mdxService = new MdxDocumentationService({
          outputDir: args.outputDir
        });
        const filePath = await mdxService.documentChanges(analyzedChanges);
        console.log(`Documentation created successfully at: ${filePath}`);
      } else {
        // Default to Confluence output
        const config: DocumentationConfig = {
          confluenceBaseUrl: process.env.CONFLUENCE_BASE_URL || "",
          confluenceToken: process.env.CONFLUENCE_TOKEN || "",
          confluenceSpaceKey: process.env.CONFLUENCE_SPACE_KEY || "",
          pageParentId: process.env.CONFLUENCE_PARENT_PAGE_ID,
        };

        if (!config.confluenceBaseUrl || !config.confluenceToken || !config.confluenceSpaceKey) {
          console.log("\nSkipping documentation: Missing Confluence configuration");
          process.exit(0);
        }

        console.log("\nGenerating documentation in Confluence...");
        const documentationService = new DocumentationService(config);
        const pageId = await documentationService.documentChanges();
        console.log(`Documentation created successfully. Page ID: ${pageId}`);
      }
    }

    // Cleanup
    await gitService.cleanup();

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
