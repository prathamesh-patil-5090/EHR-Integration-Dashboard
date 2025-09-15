import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

// Environment variables validation
const envSchema = {
  NEXT_BASE_URL: process.env.NEXT_BASE_URL,
  NEXT_FIRM_URL_PREFIX: process.env.NEXT_FIRM_URL_PREFIX,
  NEXT_API_KEY: process.env.NEXT_API_KEY,
};

// Validate environment variables
// if (!envSchema.NEXT_BASE_URL || !envSchema.NEXT_FIRM_URL_PREFIX || !envSchema.NEXT_API_KEY) {
//   throw new Error('Missing required environment variables for API configuration');
// }

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: `${envSchema.NEXT_BASE_URL}/${envSchema.NEXT_FIRM_URL_PREFIX}`,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-api-key': envSchema.NEXT_API_KEY,
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

// Process queued requests after token refresh
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor to add access token to headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const accessTokenCookie = cookies.find(cookie =>
        cookie.trim().startsWith('access_token='),
      );

      if (accessTokenCookie) {
        const accessToken = accessTokenCookie.split('=')[1];
        if (config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token from cookies
        let refreshToken = '';
        if (typeof window !== 'undefined') {
          const cookies = document.cookie.split(';');
          const refreshTokenCookie = cookies.find(cookie =>
            cookie.trim().startsWith('refresh_token='),
          );
          if (refreshTokenCookie) {
            refreshToken = refreshTokenCookie.split('=')[1];
          }
        }

        if (!refreshToken) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        const refreshResponse = await axios.post(
          `${envSchema.NEXT_BASE_URL}/${envSchema.NEXT_FIRM_URL_PREFIX}/ema/ws/oauth2/grant`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'x-api-key': envSchema.NEXT_API_KEY,
            },
          },
        );

        const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;

        if (typeof window !== 'undefined') {
          document.cookie = `access_token=${access_token}; path=/; secure; samesite=strict; max-age=3600`;
          document.cookie = `refresh_token=${newRefreshToken}; path=/; secure; samesite=strict; max-age=604800`; // 7 days
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        processQueue(null, access_token);
        return apiClient(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError, null);

        if (typeof window !== 'undefined') {
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Utility functions
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const accessTokenCookie = cookies.find(cookie =>
    cookie.trim().startsWith('access_token='),
  );
  return accessTokenCookie ? accessTokenCookie.split('=')[1] : null;
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const refreshTokenCookie = cookies.find(cookie =>
    cookie.trim().startsWith('refresh_token='),
  );
  return refreshTokenCookie ? refreshTokenCookie.split('=')[1] : null;
};

export const isAuthenticated = (): boolean => getAccessToken() !== null;

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  }
};

export default apiClient;
