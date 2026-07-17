import { supabase } from "../config/supabase.js";

const reviewSelect = "id, project_id, user_id, review_type, status, overall_score, summary, created_at";

export const createReview = async (review) => {
    const { data, error } = await supabase
        .from("reviews")
        .insert(review)
        .select(reviewSelect)
        .single();

    if (error) throw error;
    return data;
};

export const createReviewSource = async (source) => {
    const { data, error } = await supabase
        .from("review_sources")
        .insert(source)
        .select(
            "id, review_id, source_type, title, language, file_name, branch_name, line_count, character_count, metadata, created_at"
        )
        .single();

    if (error) throw error;
    return data;
};

export const createReviewSources = async (sources) => {
    const { data, error } = await supabase
        .from("review_sources")
        .insert(sources)
        .select(
            "id, review_id, source_type, title, language, file_name, branch_name, line_count, character_count, metadata, created_at"
        );

    if (error) throw error;
    return data;
};

export const listReviewsByUser = async (userId) => {
    const { data, error } = await supabase
        .from("reviews")
        .select(
            `${reviewSelect}, review_sources (id, source_type, title, language, file_name, branch_name, line_count, character_count, metadata, created_at)`
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
};

export const deleteReview = async (id) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) throw error;
};
