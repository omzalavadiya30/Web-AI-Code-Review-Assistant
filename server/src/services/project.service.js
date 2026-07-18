import * as projectRepository from "../repositories/project.repository.js";

const mapProject = (project) => ({
    id: project.id,
    user_id: project.user_id,
    project_name: project.project_name,
    github_url: project.github_url,
    created_at: project.created_at,
});

export const createProject = async (userId, payload) => {
    const project = await projectRepository.createProject({
        user_id: userId,
        project_name: payload.projectName.trim(),
        github_url: payload.githubUrl?.trim() || null,
    });

    return mapProject(project);
};

export const listProjects = async (userId) => {
    const projects = await projectRepository.listProjectsByUser(userId);
    return projects.map(mapProject);
};
