import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

export interface NavItem {
  icon: string;
  label: string;
  path: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {
  searchQuery = '';
  mobileMenuOpen = false;
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  get userName(): string {
    const user = this.authService.getCurrentUserSnapshot();
    return user?.full_name?.trim() || user?.email || 'Quản trị viên';
  }

  get userRole(): string {
    const roles = this.authService.getCurrentUserSnapshot()?.roles ?? [];
    return roles.some((role) =>
      ['admin', 'administrator', 'super_admin'].includes(role.trim().toLowerCase()),
    )
      ? 'Quản trị viên'
      : roles[0] || 'Quản trị viên';
  }

  // Đổi các icon Material sang FontAwesome class tương ứng
  navItems: NavItem[] = [
    { icon: 'fa-solid fa-chart-line', label: 'Tổng quan hệ thống', path: '/admin/system-overview' },
    { icon: 'fa-solid fa-store', label: 'Quản lý quán ăn', path: '/admin/dashboard' },
    { icon: 'fa-solid fa-shield-halved', label: 'Duyệt ảnh AI & Thẩm định', path: '/admin/ai-moderation' },
  ];

  searchAdmin(): void {
    void this.router.navigate(['/admin/dashboard'], {
      queryParams: { q: this.searchQuery.trim() || null },
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
