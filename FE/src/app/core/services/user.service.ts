import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = 'http://localhost:8000/api/auth';

  constructor(private http: HttpClient) {}

  register(userData: UserRegister): Observable<UserResponse> {
    const payload: UserRegisterRequest = {
      fullname: userData.fullname.trim(),
      email: userData.email.trim(),
      phone: userData.phone.trim(),
      password: userData.password,
    };

    return this.http.post<UserResponse>(
      `${this.apiUrl}/register`,
      payload,
    );
  }
}

export interface UserRegister {
  fullname: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface UserRegisterRequest {
  fullname: string;
  email: string;
  phone: string;
  password: string;
}

export interface UserResponse {
  id: number;
  full_name: string | null;
  email: string;
  phone: string;
}
