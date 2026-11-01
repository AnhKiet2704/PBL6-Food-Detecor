import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  identifier = '';
  password = '';

  showPassword = false;
  rememberMe = true;

  isLoading = false;
  loginSuccess = false;

  loginFormSubmitted = false;
  loginErrorMessage = '';

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.loginFormSubmitted = true;
    this.loginErrorMessage = '';

    if (!this.identifier.trim() || !this.password) {
      return;
    }

    this.isLoading = true;
    this.authService
      .login(this.identifier.trim(), this.password, this.rememberMe)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.loginSuccess = true;
          void this.router.navigate(['/home']);
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.loginErrorMessage = this.getLoginErrorMessage(error);
        },
      });
  }

  loginWithGoogle(): void {
    this.loginErrorMessage = 'Đăng nhập Google chưa được cấu hình.';
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string') {
        return detail;
      }

      if (error.status === 0) {
        return 'Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.';
      }
    }

    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }
}
