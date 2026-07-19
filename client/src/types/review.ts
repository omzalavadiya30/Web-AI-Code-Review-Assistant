export interface Review {
  id: string;
  project_id: string | null;
  user_id: string;
  review_type: "snippet" | "file" | "github";
  status: "draft" | "queued" | "completed" | "failed";
  overall_score: number | null;
  summary: string | null;
  created_at: string;
}

export interface ReviewDocumentationParameter {
  name: string;
  type: string | null;
  defaultValue: string | null;
}

export interface ReviewDocumentationItem {
  kind: "function" | "class" | "api";
  name: string;
  signature: string;
  description: string;
  fileName: string;
  lineNumber: number;
  parameters: ReviewDocumentationParameter[];
  returns: string | null;
  method: string | null;
  path: string | null;
}

export interface ReviewSourceDocumentation {
  generatedAt: string;
  language: string;
  summary: string;
  counts: {
    functions: number;
    classes: number;
    apis: number;
  };
  items: ReviewDocumentationItem[];
}

export interface ReviewSource {
  id: string;
  review_id: string;
  source_type: "snippet" | "file" | "github";
  title: string;
  language: string | null;
  file_name: string | null;
  branch_name: string | null;
  line_count: number;
  character_count: number;
  metadata: {
    focusAreas?: string[];
    reviewTitle?: string;
    originalSize?: number | null;
    mimeType?: string | null;
    documentation?: ReviewSourceDocumentation;
  };
  created_at: string;
}

export interface ReviewFinding {
  id: string;
  review_id: string;
  severity: "low" | "medium" | "high" | "critical";
  issue: string;
  explanation: string | null;
  suggested_fix: string | null;
  file_name: string | null;
  line_number: number | null;
  created_at: string;
}

export interface ReviewListItem extends Review {
  sources: ReviewSource[];
  findings: ReviewFinding[];
}

export interface CreateSnippetReviewPayload {
  title: string;
  language: string;
  fileName?: string;
  branch?: string;
  projectId?: string;
  code: string;
  focusAreas: string[];
}

export interface CreateSnippetReviewResponse {
  review: Review;
  source: ReviewSource;
  findings: ReviewFinding[];
}

export interface UploadFilePayload {
  fileName: string;
  title?: string;
  language?: string;
  content: string;
  size?: number;
  type?: string;
}

export interface CreateFileReviewPayload {
  title: string;
  language?: string;
  branch?: string;
  projectId?: string;
  focusAreas: string[];
  files: UploadFilePayload[];
}

export interface CreateFileReviewResponse {
  review: Review;
  sources: ReviewSource[];
  findings: ReviewFinding[];
}
