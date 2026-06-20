// Re-exports from the canonical AuthContext so shared/ components
// use the same context instance as the rest of the app.
export { AuthProvider, useAuth, api } from "../contexts/AuthContext";
export { default } from "../contexts/AuthContext";
