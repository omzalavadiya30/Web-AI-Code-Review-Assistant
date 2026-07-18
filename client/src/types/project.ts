export interface Project {
  id: string;
  user_id: string;
  project_name: string;
  github_url: string | null;
  created_at: string;
}

export interface CreateProjectPayload {
  projectName: string;
  githubUrl?: string;
}
