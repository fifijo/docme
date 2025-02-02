export interface CodeChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  businessLogicImpacted: boolean;
  description: string;
  timestamp: Date;
  author: string;
  commitHash: string;
  diff: string;
}

export interface AnalysisResult {
  businessLogicChanged: boolean;
  changes: string[];
  impactDescription: string;
}

export interface DocumentationConfig {
  confluenceBaseUrl: string;
  confluenceToken: string;
  confluenceSpaceKey: string;
  pageParentId?: string;
}

export interface DocumentationPage {
  title: string;
  content: string;
  labels: string[];
  spaceKey: string;
  parentId?: string;
}
