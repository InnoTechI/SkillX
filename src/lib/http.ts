import { NextResponse } from 'next/server';

// Response helpers for API routes
export function ok(data: any, message = 'OK') {
  return NextResponse.json({ success: true, message, data });
}

export function badRequest(message = 'Bad request', error = 'BAD_REQUEST', details?: any) {
  return NextResponse.json({ success: false, message, error, details }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized', error = 'UNAUTHORIZED') {
  return NextResponse.json({ success: false, message, error }, { status: 401 });
}

export function forbidden(message = 'Forbidden', error = 'FORBIDDEN') {
  return NextResponse.json({ success: false, message, error }, { status: 403 });
}

export function notFound(message = 'Not found', error = 'NOT_FOUND') {
  return NextResponse.json({ success: false, message, error }, { status: 404 });
}

export function serverError(message = 'Something went wrong', error = 'INTERNAL_SERVER_ERROR') {
  return NextResponse.json({ success: false, message, error }, { status: 500 });
}

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: 'admin' | 'user'; // Added role parameter
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  isEmailVerified?: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// Client-side API functions
export class AuthAPI {
  private static baseUrl = '/api/auth';

  static async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error occurred',
        error: 'NETWORK_ERROR',
      };
    }
  }

  static async registerAdmin(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/register-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error occurred',
        error: 'NETWORK_ERROR',
      };
    }
  }

  static async registerUser(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/register-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error occurred',
        error: 'NETWORK_ERROR',
      };
    }
  }
}

// Token management utilities
export class TokenManager {
  private static ACCESS_TOKEN_KEY = 'skillx_access_token';
  private static REFRESH_TOKEN_KEY = 'skillx_refresh_token';
  private static USER_KEY = 'skillx_user';

  static setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static setUser(user: AuthUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  static getUser(): AuthUser | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  static clearAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
