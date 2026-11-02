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

export interface NavGroup {
  label: string;
  items: NavItem[];
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
  collapsed = false;
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

  // Đường dẫn giữ nguyên như cũ; chỉ gom nhóm lại để hiển thị.
  navGroups: NavGroup[] = [
    {
      label: 'Vận hành',
      items: [
        { icon: 'fa-solid fa-gauge-high', label: 'Tổng quan hệ thống', path: '/admin/system-overview' },
        { icon: 'fa-solid fa-store', label: 'Quản lý quán ăn', path: '/admin/dashboard' },
      ],
    },
    {
      label: 'Kiểm duyệt',
      items: [
        { icon: 'fa-solid fa-shield-halved', label: 'Duyệt ảnh AI & Thẩm định', path: '/admin/ai-moderation' },
      ],
    },
  ];

  get navItems(): NavItem[] {
    return this.navGroups.flatMap((group) => group.items);
  }

  get currentTitle(): string {
    const url = this.router.url.split('?')[0].split('#')[0];
    return this.navItems.find((item) => item.path === url)?.label ?? 'Tổng quan';
  }

  get initials(): string {
    const parts = this.userName.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? 'Q').slice(0, 2);
    return letters.toUpperCase();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

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
