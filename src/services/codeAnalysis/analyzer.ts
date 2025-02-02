import { parse } from "@typescript-eslint/typescript-estree";
import { AnalysisResult, CodeChange } from "../../types/code-changes.js";
import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/types";

export class CodeAnalyzer {
  private businessLogicKeywords = [
    "controller",
    "service",
    "repository",
    "model",
    "validator",
    "middleware",
    "handler",
    "processor",
    "calculate",
    "compute",
    "validate",
    "transform",
    "process",
    "business",
    "logic",
    "rule",
    "workflow",
    "policy",
  ];

  private businessLogicPatterns = [
    /\b(get|set|update|delete|create|process|validate)\w*\b/,
    /\b(business|domain)\s*(logic|rule|workflow|process)\b/,
    /\b(service|controller|repository|model)\b/i,
    /\@(Controller|Service|Repository|Entity|Injectable)/,
    /extends\s+(Base)?(Controller|Service|Repository|Model)/,
  ];

  private isBusinessLogicFile(filePath: string): boolean {
    const businessLogicPaths = [
      /\/services?\//,
      /\/controllers?\//,
      /\/models?\//,
      /\/repositories?\//,
      /\/domain\//,
      /\/business\//,
      /\/core\//,
    ];

    return businessLogicPaths.some((pattern) => pattern.test(filePath));
  }

  private containsBusinessLogicKeywords(content: string): boolean {
    const lowercaseContent = content.toLowerCase();
    return this.businessLogicKeywords.some((keyword) =>
      lowercaseContent.includes(keyword.toLowerCase())
    );
  }

  private matchesBusinessLogicPatterns(content: string): boolean {
    return this.businessLogicPatterns.some((pattern) => pattern.test(content));
  }

  private analyzeAst(code: string): boolean {
    try {
      const ast = parse(code, {
        jsx: true,
        loc: true,
      });

      let hasBusinessLogic = false;

      const visitNode = (node: TSESTree.Node): void => {
        // Check for function declarations and class methods
        if (
          node.type === AST_NODE_TYPES.FunctionDeclaration ||
          node.type === AST_NODE_TYPES.MethodDefinition
        ) {
          const name = node.type === AST_NODE_TYPES.FunctionDeclaration
            ? (node.id?.name || "")
            : ((node.key as TSESTree.Identifier).name || "");
          if (this.businessLogicPatterns.some((pattern) => pattern.test(name))) {
            hasBusinessLogic = true;
          }
        }

        // Check for decorators
        if ("decorators" in node && node.decorators) {
          for (const decorator of node.decorators) {
            if (
              decorator.expression.type === AST_NODE_TYPES.Identifier &&
              this.businessLogicPatterns.some((pattern) =>
                pattern.test((decorator.expression as TSESTree.Identifier).name)
              )
            ) {
              hasBusinessLogic = true;
            }
          }
        }

        // Recursively visit all children
        for (const key in node) {
          const child = node[key as keyof typeof node];
          if (child && typeof child === "object") {
            if (Array.isArray(child)) {
              child.forEach((item) => {
                if (item && typeof item === "object") {
                  visitNode(item as TSESTree.Node);
                }
              });
            } else {
              visitNode(child as TSESTree.Node);
            }
          }
        }
      };

      visitNode(ast as TSESTree.Program);
      return hasBusinessLogic;
    } catch (error) {
      console.error("Failed to parse AST:", error);
      // Fallback to simpler analysis if AST parsing fails
      return (
        this.containsBusinessLogicKeywords(code) ||
        this.matchesBusinessLogicPatterns(code)
      );
    }
  }

  private generateDescription(
    filePath: string,
    changeType: string,
    hasBusinessLogic: boolean
  ): string {
    let description = `${changeType} file: ${filePath}. `;

    if (hasBusinessLogic) {
      description += "This change impacts business logic. ";
      if (this.isBusinessLogicFile(filePath)) {
        description +=
          "The file is located in a business logic directory, suggesting core functionality changes. ";
      }
    } else {
      description +=
        "This change does not appear to directly impact business logic. ";
    }

    return description.trim();
  }

  async analyzeChange(change: CodeChange): Promise<AnalysisResult> {
    const { filePath, changeType, diff } = change;

    // Skip analysis for deleted files
    if (changeType === "deleted") {
      return {
        businessLogicChanged: false,
        changes: [`Deleted file: ${filePath}`],
        impactDescription: `File ${filePath} was deleted.`,
      };
    }

    const isBusinessLogicFileLocation = this.isBusinessLogicFile(filePath);
    const hasBusinessLogicContent =
      this.containsBusinessLogicKeywords(diff) ||
      this.matchesBusinessLogicPatterns(diff);
    const hasBusinessLogicAst = this.analyzeAst(diff);

    const businessLogicChanged =
      isBusinessLogicFileLocation || hasBusinessLogicContent || hasBusinessLogicAst;

    const changes: string[] = [];
    if (isBusinessLogicFileLocation) {
      changes.push("File is in a business logic directory");
    }
    if (hasBusinessLogicContent) {
      changes.push("Contains business logic related keywords or patterns");
    }
    if (hasBusinessLogicAst) {
      changes.push("AST analysis indicates business logic modifications");
    }

    return {
      businessLogicChanged,
      changes,
      impactDescription: this.generateDescription(
        filePath,
        changeType,
        businessLogicChanged
      ),
    };
  }

  async analyzeChanges(changes: CodeChange[]): Promise<CodeChange[]> {
    const analyzedChanges: CodeChange[] = [];

    for (const change of changes) {
      const analysis = await this.analyzeChange(change);
      analyzedChanges.push({
        ...change,
        businessLogicImpacted: analysis.businessLogicChanged,
        description: analysis.impactDescription,
      });
    }

    return analyzedChanges;
  }
}
