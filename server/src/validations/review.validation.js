import { body, validationResult } from "express-validator";

const MAX_SNIPPET_CHARACTERS = 100000;
const MAX_UPLOAD_FILES = 8;
const MAX_FILE_CHARACTERS = 100000;
const MAX_TOTAL_FILE_CHARACTERS = 250000;

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array(),
        });
    }
    next();
};

export const createSnippetReviewValidation = [
    body("title")
        .isString()
        .withMessage("Review title is required")
        .bail()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("Review title must be between 3 and 255 characters"),
    body("language")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("Language must be text")
        .bail()
        .trim()
        .isLength({ max: 80 })
        .withMessage("Language must be 80 characters or fewer"),
    body("fileName")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("File name must be text")
        .bail()
        .trim()
        .isLength({ max: 255 })
        .withMessage("File name must be 255 characters or fewer"),
    body("branch")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("Branch must be text")
        .bail()
        .trim()
        .isLength({ max: 120 })
        .withMessage("Branch must be 120 characters or fewer"),
    body("code")
        .isString()
        .withMessage("Code snippet is required")
        .bail()
        .custom((value) => value.trim().length > 0)
        .withMessage("Code snippet cannot be empty")
        .bail()
        .isLength({ max: MAX_SNIPPET_CHARACTERS })
        .withMessage(`Code snippet must be ${MAX_SNIPPET_CHARACTERS} characters or fewer`),
    body("focusAreas")
        .optional()
        .isArray({ max: 10 })
        .withMessage("Focus areas must be a list of up to 10 items"),
    body("focusAreas.*")
        .optional()
        .isString()
        .withMessage("Each focus area must be text")
        .bail()
        .trim()
        .isLength({ min: 1, max: 60 })
        .withMessage("Each focus area must be between 1 and 60 characters"),
    handleValidation,
];

export const createFileReviewValidation = [
    body("title")
        .isString()
        .withMessage("Review title is required")
        .bail()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage("Review title must be between 3 and 255 characters"),
    body("language")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("Language must be text")
        .bail()
        .trim()
        .isLength({ max: 80 })
        .withMessage("Language must be 80 characters or fewer"),
    body("branch")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("Branch must be text")
        .bail()
        .trim()
        .isLength({ max: 120 })
        .withMessage("Branch must be 120 characters or fewer"),
    body("focusAreas")
        .optional()
        .isArray({ max: 10 })
        .withMessage("Focus areas must be a list of up to 10 items"),
    body("focusAreas.*")
        .optional()
        .isString()
        .withMessage("Each focus area must be text")
        .bail()
        .trim()
        .isLength({ min: 1, max: 60 })
        .withMessage("Each focus area must be between 1 and 60 characters"),
    body("files")
        .isArray({ min: 1, max: MAX_UPLOAD_FILES })
        .withMessage(`Upload between 1 and ${MAX_UPLOAD_FILES} files`)
        .bail()
        .custom((files) => {
            const totalCharacters = files.reduce(
                (total, file) => total + (typeof file.content === "string" ? file.content.length : 0),
                0
            );
            return totalCharacters <= MAX_TOTAL_FILE_CHARACTERS;
        })
        .withMessage(
            `Uploaded file content must be ${MAX_TOTAL_FILE_CHARACTERS} characters or fewer in total`
        ),
    body("files.*.fileName")
        .isString()
        .withMessage("Each file must include a file name")
        .bail()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("Each file name must be between 1 and 255 characters"),
    body("files.*.title")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("File title must be text")
        .bail()
        .trim()
        .isLength({ max: 255 })
        .withMessage("File title must be 255 characters or fewer"),
    body("files.*.language")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("File language must be text")
        .bail()
        .trim()
        .isLength({ max: 80 })
        .withMessage("File language must be 80 characters or fewer"),
    body("files.*.content")
        .isString()
        .withMessage("Each file must include readable source code")
        .bail()
        .custom((value) => value.trim().length > 0)
        .withMessage("Uploaded files cannot be empty")
        .bail()
        .isLength({ max: MAX_FILE_CHARACTERS })
        .withMessage(`Each uploaded file must be ${MAX_FILE_CHARACTERS} characters or fewer`),
    body("files.*.size")
        .optional({ values: "falsy" })
        .isInt({ min: 0 })
        .withMessage("File size must be a positive number"),
    body("files.*.type")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("File type must be text")
        .bail()
        .trim()
        .isLength({ max: 120 })
        .withMessage("File type must be 120 characters or fewer"),
    handleValidation,
];
