import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
  userName = 'Lê Hoàng Nam';
  userRole = 'Quản trị viên trưởng';
  mobileMenuOpen = false;
  private readonly router = inject(Router);

  // Dữ liệu Menu
  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Tổng quan hệ thống', path: '/admin/system-overview' },
    { icon: 'storefront', label: 'Quản lý quán ăn', path: '/admin/dashboard' },
    { icon: 'fact_check', label: 'Duyệt món & Kiểm định', path: '/admin/ai-moderation' },
  ];

  searchAdmin(): void {
    void this.router.navigate(['/admin/dashboard'], {
      queryParams: { q: this.searchQuery.trim() || null },
    });
  }
}
