import { HTTP_STATUS } from "../config/constants.js";
import * as projectService from "../services/project.service.js";
import { asyncHandler, successResponse } from "../utils/apiHandler.js";

export const createProject = asyncHandler(async (req, res) => {
    const project = await projectService.createProject(req.user.id, req.body);
    successResponse(res, HTTP_STATUS.CREATED, "Project created successfully", project);
});

export const listProjects = asyncHandler(async (req, res) => {
    const projects = await projectService.listProjects(req.user.id);
    successResponse(res, HTTP_STATUS.OK, "Projects fetched successfully", projects);
});
