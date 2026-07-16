import dotenv from "dotenv"
dotenv.config()

export const PORT = process.env.PORT || 5000
export const NODE_ENV = process.env.NODE_ENV || "development"
export const SUPABASE_URL = process.env.SUPABASE_URL
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
export const JWT_SECRET = process.env.JWT_SECRET
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,

    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,

    INTERNAL_SERVER_ERROR: 500,
};


const config = { PORT, NODE_ENV, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, JWT_EXPIRES_IN, OPENAI_API_KEY, HTTP_STATUS }
export default config