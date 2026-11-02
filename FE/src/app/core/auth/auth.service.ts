import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  LoginUser,
} from '../../shared/features/auth/models/login-request.model';

function isLoginUser(value: unknown): value is LoginUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'full_name' in value &&
    (typeof value.full_name === 'string' || value.full_name === null) &&
    'phone' in value &&
    (typeof value.phone === 'string' || value.phone === null) &&
    'roles' in value &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === 'string')
  );
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000/api/auth';
  private readonly currentUserSubject = new BehaviorSubject<LoginUser | null>(
    this.readStoredUser(),
  );
  readonly currentUser$ = this.currentUserSubject.asObservable();

  login(
    identifier: string,
    password: string,
    rememberMe: boolean,
  ): Observable<LoginResponse> {
    const request: LoginRequest = { identifier, password };

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, request)
      .pipe(
        tap(({ access_token, user }) => {
          this.logout();
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('access_token', access_token);
          storage.setItem('current_user', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!(
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token')
    );
  }

  hasAdminRole(): boolean {
    const roles = this.currentUserSubject.value?.roles ?? [];
    return roles.some((role) =>
      ['admin', 'administrator', 'super_admin', 'quản trị viên', 'quản trị viên trưởng']
        .includes(role.trim().toLocaleLowerCase()),
    );
  }

  getCurrentUserSnapshot(): LoginUser | null {
    return this.currentUserSubject.value;
  }

  private readStoredUser(): LoginUser | null {
    const storedUser =
      localStorage.getItem('current_user') ??
      sessionStorage.getItem('current_user');

    if (!storedUser) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (isLoginUser(user)) {
        return user;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }

    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');
    return null;
  }
}
