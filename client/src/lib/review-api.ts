import { api } from "./api";
import type {
  CreateFileReviewPayload,
  CreateFileReviewResponse,
  CreateSnippetReviewPayload,
  CreateSnippetReviewResponse,
  ReviewListItem,
} from "@/types/review";

export const reviewApi = {
  createSnippet(payload: CreateSnippetReviewPayload) {
    return api.post<CreateSnippetReviewResponse>("/reviews/snippet", payload, true);
  },

  createFiles(payload: CreateFileReviewPayload) {
    return api.post<CreateFileReviewResponse>("/reviews/files", payload, true);
  },

  list() {
    return api.get<ReviewListItem[]>("/reviews", true);
  },
};
