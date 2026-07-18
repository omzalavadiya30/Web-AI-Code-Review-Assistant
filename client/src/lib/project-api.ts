import { api } from "./api";
import type { CreateProjectPayload, Project } from "@/types/project";

export const projectApi = {
  create(payload: CreateProjectPayload) {
    return api.post<Project>("/projects", payload, true);
  },

  list() {
    return api.get<Project[]>("/projects", true);
  },
};
