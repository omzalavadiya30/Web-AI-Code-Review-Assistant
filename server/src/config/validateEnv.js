import { JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./constants.js";

const requiredEnvVars = [
    { key: "SUPABASE_URL", value: SUPABASE_URL },
    { key: "SUPABASE_SERVICE_ROLE_KEY", value: SUPABASE_SERVICE_ROLE_KEY },
    { key: "JWT_SECRET", value: JWT_SECRET },
];

export const validateEnv = () => {
    const missing = requiredEnvVars.filter(({ value }) => !value).map(({ key }) => key);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
};
