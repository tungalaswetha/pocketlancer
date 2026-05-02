import axios, { AxiosInstance, AxiosError } from "axios";

/**
 * Axios instance configured for PocketLancer
 * ------------------------------------------
 * Responsibilities:
 * - Attach cookies
 * - Normalize responses
 * - Log only real server failures
 *
 * NOT responsible for:
 * - Redirecting users
 * - Deciding auth UX
 * - Reading browser globals
 */

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api",
  withCredentials: true, // REQUIRED for httpOnly cookies
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Response Interceptor — Safety Net
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    /**
     * Industry rule:
     * - 401 / 403 → auth state, NOT errors
     * - 404 → wrong route, handled by caller
     * - 5xx → real server problems (log them)
     */
    if (status && status >= 500) {
      console.error(`[API SERVER ERROR]: ${status} - ${error.message}`);
    }

    return Promise.reject(error);
  },
);

export default api;
