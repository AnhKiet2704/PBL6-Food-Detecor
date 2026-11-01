import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginUser } from '../../features/auth/models/login-request.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  currentLang: 'VIE' | 'ENG' = 'VIE';
  isLoggedIn = this.authService.isLoggedIn();
  currentUser: LoginUser | null = null;

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser = user;
        this.isLoggedIn = this.authService.isLoggedIn();
      });
  }

  switchLanguage(lang: 'VIE' | 'ENG'): void {
    this.currentLang = lang;
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/home']);
  }
}
