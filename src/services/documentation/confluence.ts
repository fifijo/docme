import axios, { AxiosInstance } from "axios";
import { DocumentationConfig, DocumentationPage } from "@/types/code-changes";

export class ConfluenceService {
  private client: AxiosInstance;
  private config: DocumentationConfig;

  constructor(config: DocumentationConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.confluenceBaseUrl,
      headers: {
        "Authorization": `Bearer ${config.confluenceToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  private generateConfluenceContent(page: DocumentationPage): string {
    return `
      <ac:structured-macro ac:name="info">
        <ac:rich-text-body>
          <p>This documentation was automatically generated to track code changes that affect business logic.</p>
        </ac:rich-text-body>
      </ac:structured-macro>

      <h1>${page.title}</h1>

      ${page.content}

      <ac:structured-macro ac:name="code">
        <ac:parameter ac:name="language">none</ac:parameter>
        <ac:plain-text-body>
          <![CDATA[Labels: ${page.labels.join(", ")}]]>
        </ac:plain-text-body>
      </ac:structured-macro>
    `;
  }

  async createPage(page: DocumentationPage): Promise<string> {
    try {
      const response = await this.client.post("/rest/api/content", {
        type: "page",
        title: page.title,
        space: {
          key: page.spaceKey || this.config.confluenceSpaceKey,
        },
        body: {
          storage: {
            value: this.generateConfluenceContent(page),
            representation: "storage",
          },
        },
        ancestors: page.parentId
          ? [{ id: page.parentId || this.config.pageParentId }]
          : [],
        metadata: {
          labels: page.labels.map((label) => ({ name: label })),
        },
      });

      return response.data.id;
    } catch (error) {
      console.error("Failed to create Confluence page:", error);
      throw new Error("Failed to create documentation page in Confluence");
    }
  }

  async updatePage(
    pageId: string,
    page: DocumentationPage,
    version: number
  ): Promise<void> {
    try {
      await this.client.put(`/rest/api/content/${pageId}`, {
        type: "page",
        title: page.title,
        body: {
          storage: {
            value: this.generateConfluenceContent(page),
            representation: "storage",
          },
        },
        version: {
          number: version + 1,
        },
        metadata: {
          labels: page.labels.map((label) => ({ name: label })),
        },
      });
    } catch (error) {
      console.error("Failed to update Confluence page:", error);
      throw new Error("Failed to update documentation page in Confluence");
    }
  }

  async findPage(title: string): Promise<{ id: string; version: number } | null> {
    try {
      const response = await this.client.get(
        `/rest/api/content?title=${encodeURIComponent(
          title
        )}&spaceKey=${this.config.confluenceSpaceKey}&expand=version`
      );

      if (response.data.results && response.data.results.length > 0) {
        const page = response.data.results[0];
        return {
          id: page.id,
          version: page.version.number,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to find Confluence page:", error);
      throw new Error("Failed to search for documentation page in Confluence");
    }
  }

  async createOrUpdatePage(page: DocumentationPage): Promise<string> {
    try {
      const existingPage = await this.findPage(page.title);

      if (existingPage) {
        await this.updatePage(existingPage.id, page, existingPage.version);
        return existingPage.id;
      }

      return await this.createPage(page);
    } catch (error) {
      console.error("Failed to create/update Confluence page:", error);
      throw new Error(
        "Failed to create or update documentation page in Confluence"
      );
    }
  }
}
