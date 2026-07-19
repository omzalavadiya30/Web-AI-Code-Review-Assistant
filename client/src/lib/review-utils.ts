import type { ReviewListItem } from "@/types/review";

export const formatReviewStatus = (status: ReviewListItem["status"]) =>
  status === "failed" ? "Flagged" : status.charAt(0).toUpperCase() + status.slice(1);

export const formatReviewType = (type: ReviewListItem["review_type"]) =>
  type === "github" ? "GitHub" : type.charAt(0).toUpperCase() + type.slice(1);

export const getReviewDateLabels = (createdAt: string) => {
  const date = new Date(createdAt);

  return {
    iso: createdAt.slice(0, 10),
    short: date.toLocaleDateString(),
  };
};

export const getReviewTitle = (review: ReviewListItem) =>
  review.sources[0]?.metadata?.reviewTitle || review.sources[0]?.title || "Untitled review";
