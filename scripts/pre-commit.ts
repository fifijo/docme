import { DocumentationService } from "../src/services/documentation/documentationService";
import { DocumentationConfig } from "../src/types/code-changes";

async function main() {
  try {
    // Load config from environment variables
    const config: DocumentationConfig = {
      confluenceBaseUrl: process.env.CONFLUENCE_BASE_URL || "",
      confluenceToken: process.env.CONFLUENCE_TOKEN || "",
      confluenceSpaceKey: process.env.CONFLUENCE_SPACE_KEY || "",
      pageParentId: process.env.CONFLUENCE_PARENT_PAGE_ID,
    };

    // Validate required configuration
    if (!config.confluenceBaseUrl || !config.confluenceToken || !config.confluenceSpaceKey) {
      console.error(
        "Missing required environment variables. Please set CONFLUENCE_BASE_URL, CONFLUENCE_TOKEN, and CONFLUENCE_SPACE_KEY."
      );
      process.exit(1);
    }

    const documentationService = new DocumentationService(config);

    // Generate preview first
    const preview = await documentationService.generatePreview();
    console.log("\nChanges to be documented:");
    console.log(preview);

    // Prompt for confirmation
    const readline = (await import("readline")).createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      "\nDo you want to proceed with documenting these changes? (y/n) ",
      async (answer: string) => {
        readline.close();

        if (answer.toLowerCase() === "y") {
          const pageId = await documentationService.documentChanges();
          console.log(`\nChanges documented successfully. Page ID: ${pageId}`);
          process.exit(0);
        } else {
          console.log("\nDocumentation cancelled. Commit aborted.");
          process.exit(1);
        }
      }
    );
  } catch (error) {
    console.error("Failed to run pre-commit hook:", error);
    process.exit(1);
  }
}

main();
