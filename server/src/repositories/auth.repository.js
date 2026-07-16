import { supabase } from "../config/supabase.js";

export const findUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const findUserById = async (id) => {
    const { data, error } = await supabase
        .from("users")
        .select("id, name, email, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const findUserWithPasswordById = async (id) => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const createUser = async (user) => {
    const { data, error } = await supabase
        .from("users")
        .insert(user)
        .select("id, name, email, created_at")
        .single();

    if (error) throw error;
    return data;
};

export const updateUser = async (id, updates) => {
    const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select("id, name, email, created_at, updated_at")
        .single();

    if (error) throw error;
    return data;
};

export const findUserByResetToken = async (token) => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("reset_token", token)
        .maybeSingle();

    if (error) throw error;
    return data;
};
