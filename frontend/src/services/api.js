import axios from "axios";

const TOKEN_KEY = "access_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const register = (formData) =>
  api.post("/auth/register", formData);

export const getProfile = () => api.get("/auth/profile");

export const getDashboard = () => api.get("/dashboard");

export const runAnalysis = (formData) => api.post("/analyze", formData);

export const getHistory = () => api.get("/history");

export const getIncidents = () => api.get("/incidents");
export const getIncident = (incidentId) => api.get(`/incidents/${incidentId}`);

export default api;
