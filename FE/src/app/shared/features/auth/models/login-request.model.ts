export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginUser {
  id: number;
  full_name: string | null;
  email: string;
  phone: string | null;
  roles: string[];
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: LoginUser;
}