/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, {
  getProfile,
  login as apiLogin,
  register as apiRegister,
} from "../services/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "access_token";

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.response?.data?.error || fallback;
}

function extractUser(response) {
  return response.data?.user || response.data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
    setError("");

    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const response = await getProfile();
    const profileUser = extractUser(response);
    setUser(profileUser);
    return profileUser;
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    async function hydrateUser() {
      setLoading(true);
      setError("");

      try {
        const response = await getProfile();

        if (active) {
          setUser(extractUser(response));
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err, "Session expired. Please sign in again."));
          logout();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    hydrateUser();

    return () => {
      active = false;
    };
  }, [logout, token]);

  const login = async (email, password) => {
    setLoading(true);
    setError("");

    try {
      const response = await apiLogin(email, password);
      const accessToken = response.data?.access_token;

      if (!accessToken) {
        throw new Error("Login response did not include an access token.");
      }

      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const profileUser = await loadProfile();
      return { ...response.data, user: profileUser };
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    setError("");

    try {
      await apiRegister(formData);
      return await login(formData.email, formData.password);
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError("");

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
