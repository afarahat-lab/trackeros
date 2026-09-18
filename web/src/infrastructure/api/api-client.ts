import type {
  EmployeeProfile,
  LeaveBalanceView,
  LeaveRequestView,
  LoginResponse,
} from '../../shared/types/index';
import { ApiError } from './api-error';
import type { ITokenStorage } from './token-storage';

interface ApiErrorBody {
  error?: unknown;
  code?: unknown;
}

export interface IApiClient {
  login(email: string, password: string): Promise<LoginResponse>;
  getMe(): Promise<EmployeeProfile>;
  getLeaves(): Promise<LeaveRequestView[]>;
  getLeave(id: string): Promise<LeaveRequestView>;
  getBalances(): Promise<LeaveBalanceView[]>;
}

export class ApiClient implements IApiClient {
  private readonly tokenStorage: ITokenStorage;

  constructor(tokenStorage: ITokenStorage) {
    this.tokenStorage = tokenStorage;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const body = JSON.stringify({ email, password });
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body,
      authenticated: false,
    });
  }

  getMe(): Promise<EmployeeProfile> {
    return this.request<EmployeeProfile>('/employees/me', {
      authenticated: true,
    });
  }

  getLeaves(): Promise<LeaveRequestView[]> {
    return this.request<LeaveRequestView[]>('/leaves', {
      authenticated: true,
    });
  }

  getLeave(id: string): Promise<LeaveRequestView> {
    return this.request<LeaveRequestView>(`/leaves/${id}`, {
      authenticated: true,
    });
  }

  getBalances(): Promise<LeaveBalanceView[]> {
    return this.request<LeaveBalanceView[]>('/balances/me', {
      authenticated: true,
    });
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: string; authenticated: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.authenticated) {
      const token = this.tokenStorage.getToken();
      if (token !== null) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let response: Response;
    try {
      response = await fetch(path, {
        method: options.method ?? 'GET',
        headers,
        body: options.body,
      });
    } catch (cause) {
      throw new ApiError(
        cause instanceof Error ? cause.message : 'Network request failed',
        0,
      );
    }

    if (!response.ok) {
      if (response.status === 401 && options.authenticated) {
        this.tokenStorage.clear();
      }
      throw await ApiClient.toApiError(response);
    }

    return (await response.json()) as T;
  }

  private static async toApiError(response: Response): Promise<ApiError> {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    const message =
      typeof body?.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    const code = typeof body?.code === 'string' ? body.code : undefined;

    return new ApiError(message, response.status, code);
  }
}
