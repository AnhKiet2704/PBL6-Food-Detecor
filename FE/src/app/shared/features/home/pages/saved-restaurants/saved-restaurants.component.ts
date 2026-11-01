import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';

export interface UserProfile {
  id: number;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string | null;
  saved_restaurant_count: number | null;
  review_count: number | null;
  foods_reviewed_count: number | null;
}

export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  address: string;
  district: string | null;
  phone: string | null;
  opening_hours: string | null;
  image_url: string | null;
  average_rating: number;
  review_count: number;
  min_price: number | null;
  max_price: number | null;
}

export interface UserReview {
  id: number;
  food_name: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
}

@Component({
  selector: 'app-saved-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './saved-restaurants.component.html',
})
export class SavedRestaurantsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = 'http://localhost:8000/api';

  userProfile: UserProfile = this.createProfileFallback();
  restaurants: Restaurant[] = [];
  reviews: UserReview[] = [];
  searchTerm = '';
  selectedDistrict = 'Tất cả';
  isEditingProfile = false;
  isSavingProfile = false;
  profileNotice = '';
  profileForm = { full_name: '', phone: '' };
  isLoadingSaved = true;
  savedErrorMessage = '';
  reviewsErrorMessage = '';
  readonly savingIds = new Set<number>();

  ngOnInit(): void {
    this.fetchData();
  }

  get filteredRestaurants(): Restaurant[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    return this.restaurants.filter((restaurant) =>
      (this.selectedDistrict === 'Tất cả' ||
        (restaurant.district ?? 'Khu vực khác') === this.selectedDistrict) &&
      (!query ||
        `${restaurant.name} ${restaurant.address} ${restaurant.district ?? ''}`
          .toLocaleLowerCase()
          .includes(query)),
    );
  }

  get districtFilters(): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();
    for (const restaurant of this.restaurants) {
      const district = restaurant.district || 'Khu vực khác';
      counts.set(district, (counts.get(district) ?? 0) + 1);
    }

    return [
      { name: 'Tất cả', count: this.restaurants.length },
      ...Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
        a.name.localeCompare(b.name, 'vi'),
      ),
    ];
  }

  fetchData(): void {
    this.isLoadingSaved = true;
    this.savedErrorMessage = '';
    this.reviewsErrorMessage = '';

    this.http
      .get<UserProfile>(`${this.apiUrl}/auth/me`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.userProfile = profile;
          this.profileForm = {
            full_name: profile.full_name ?? '',
            phone: profile.phone ?? '',
          };
        },
        error: (error: unknown) => {
          this.profileNotice = this.getErrorMessage(error);
        },
      });

    this.http
      .get<Restaurant[]>(`${this.apiUrl}/restaurants/saved`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurants) => {
          this.restaurants = restaurants;
          this.isLoadingSaved = false;
        },
        error: (error: unknown) => {
          this.savedErrorMessage = this.getErrorMessage(error);
          this.isLoadingSaved = false;
        },
      });

    this.http
      .get<UserReview[]>(`${this.apiUrl}/auth/me/reviews`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews = reviews;
        },
        error: (error: unknown) => {
          this.reviewsErrorMessage = this.getErrorMessage(error);
        },
      });
  }

  private createProfileFallback(): UserProfile {
    const user = this.authService.getCurrentUserSnapshot();
    return {
      id: user?.id ?? 0,
      full_name: user?.full_name ?? null,
      email: user?.email ?? '',
      phone: user?.phone ?? null,
      created_at: null,
      saved_restaurant_count: null,
      review_count: null,
      foods_reviewed_count: null,
    };
  }

  saveProfile(): void {
    if (this.isSavingProfile) {
      return;
    }

    this.isSavingProfile = true;
    this.profileNotice = '';
    this.http
      .patch<UserProfile>(`${this.apiUrl}/auth/me`, {
        full_name: this.profileForm.full_name.trim(),
        phone: this.profileForm.phone.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.userProfile = profile;
          this.profileForm = {
            full_name: profile.full_name ?? '',
            phone: profile.phone ?? '',
          };
          this.profileNotice = 'Đã cập nhật hồ sơ.';
          this.isEditingProfile = false;
          this.isSavingProfile = false;
        },
        error: (error: unknown) => {
          this.profileNotice = this.getErrorMessage(error);
          this.isSavingProfile = false;
        },
      });
  }

  cancelProfileEdit(): void {
    this.profileForm = {
      full_name: this.userProfile?.full_name ?? '',
      phone: this.userProfile?.phone ?? '',
    };
    this.isEditingProfile = false;
    this.profileNotice = '';
  }

  openProfileSettings(): void {
    this.isEditingProfile = true;
    this.profileNotice = '';
  }

  toggleSave(restaurant: Restaurant): void {
    if (this.savingIds.has(restaurant.id)) {
      return;
    }

    this.savingIds.add(restaurant.id);
    this.savedErrorMessage = '';

    this.http
      .delete<{ saved: boolean }>(
        `${this.apiUrl}/restaurants/${restaurant.id}/favorite`,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.restaurants = this.restaurants.filter(
            (item) => item.id !== restaurant.id,
          );
          if (this.userProfile.saved_restaurant_count !== null) {
            this.userProfile = {
              ...this.userProfile,
              saved_restaurant_count: Math.max(
                0,
                this.userProfile.saved_restaurant_count - 1,
              ),
            };
          }
          this.savingIds.delete(restaurant.id);
        },
        error: (error: unknown) => {
          this.savedErrorMessage = this.getErrorMessage(error);
          this.savingIds.delete(restaurant.id);
        },
      });
  }

  formatPriceRange(restaurant: Restaurant): string {
    const format = (price: number) =>
      `${new Intl.NumberFormat('vi-VN').format(price)}đ`;

    if (restaurant.min_price === null && restaurant.max_price === null) {
      return 'Chưa có thông tin giá';
    }
    if (restaurant.min_price === null) {
      return `Tối đa ${format(restaurant.max_price!)}`;
    }
    if (restaurant.max_price === null) {
      return `Từ ${format(restaurant.min_price)}`;
    }
    if (restaurant.min_price === restaurant.max_price) {
      return format(restaurant.min_price);
    }
    return `${format(restaurant.min_price)} - ${format(restaurant.max_price)}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.detail === 'string') {
        return error.error.detail;
      }
      if (error.status === 0) {
        return 'Không thể kết nối máy chủ. Vui lòng kiểm tra backend.';
      }
      if (error.status === 401) {
        return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      }
    }
    return 'Không thể tải dữ liệu. Vui lòng thử lại.';
  }
}
