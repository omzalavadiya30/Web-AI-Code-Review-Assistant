import { supabase } from "../config/supabase.js";

const projectSelect = "id, user_id, project_name, github_url, created_at";

export const createProject = async (project) => {
    const { data, error } = await supabase
        .from("projects")
        .insert(project)
        .select(projectSelect)
        .single();

    if (error) throw error;
    return data;
};

export const listProjectsByUser = async (userId) => {
    const { data, error } = await supabase
        .from("projects")
        .select(projectSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
};

export const getProjectByUser = async (id, userId) => {
    const { data, error } = await supabase
        .from("projects")
        .select(projectSelect)
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    return data;
};
