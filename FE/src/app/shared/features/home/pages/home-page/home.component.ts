import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface HomeCategory {
  name: string;
  slug: string;
  image_url: string | null;
  food_count: number;
}

interface HomeFood {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  average_price: number | null;
  average_rating: number;
  review_count: number;
  restaurants: Array<{ id: number; name: string; address: string; price: number | null }>;
}

interface HomeRestaurant {
  id: number;
  slug: string;
  name: string;
  address: string;
  district: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  average_rating: number;
  review_count: number;
  min_price: number | null;
  distance_km: number | null;
  maps_url: string | null;
}

interface HomepageResponse {
  categories: HomeCategory[];
  featured_foods: HomeFood[];
  popular_foods: HomeFood[];
  nearby_restaurants: HomeRestaurant[];
  restaurant_count: number;
  district: string | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = 'http://localhost:8000/api/foods/homepage';
  private requestId = 0;

  searchQuery = '';
  selectedDistrict = '';
  readonly districts = ['', 'Hải Châu', 'Sơn Trà', 'Ngũ Hành Sơn', 'Thanh Khê', 'Cẩm Lệ', 'Liên Chiểu'];
  categories: HomeCategory[] = [];
  featuredFoods: HomeFood[] = [];
  popularFoods: HomeFood[] = [];
  nearbyRestaurants: HomeRestaurant[] = [];
  restaurantCount = 0;
  isLoading = true;
  isLocating = false;
  errorMessage = '';
  locationMessage = '';

  ngOnInit(): void {
    void this.loadHomepage();
  }

  async loadHomepage(latitude?: number, longitude?: number): Promise<void> {
    const requestId = ++this.requestId;
    this.isLoading = true;
    this.errorMessage = '';
    let params = new HttpParams();
    if (this.selectedDistrict) params = params.set('district', this.selectedDistrict);
    if (latitude !== undefined && longitude !== undefined) {
      params = params.set('latitude', latitude).set('longitude', longitude);
    }

    try {
      const response = await firstValueFrom(
        this.http.get<HomepageResponse>(this.apiUrl, { params }),
      );
      if (requestId !== this.requestId) return;
      this.categories = response.categories;
      this.featuredFoods = response.featured_foods;
      this.popularFoods = response.popular_foods;
      this.nearbyRestaurants = response.nearby_restaurants;
      this.restaurantCount = response.restaurant_count;
    } catch (error: unknown) {
      if (requestId !== this.requestId) return;
      this.errorMessage = error instanceof HttpErrorResponse
        ? error.error?.detail || 'Không thể tải dữ liệu Google Maps. Vui lòng thử lại.'
        : 'Không thể tải dữ liệu Google Maps. Vui lòng thử lại.';
      this.categories = [];
      this.featuredFoods = [];
      this.popularFoods = [];
      this.nearbyRestaurants = [];
      this.restaurantCount = 0;
    } finally {
      if (requestId === this.requestId) this.isLoading = false;
    }
  }

  submitSearch(query = this.searchQuery): void {
    const normalizedQuery = query.trim();
    void this.router.navigate(['/food-search'], {
      queryParams: { q: normalizedQuery || null },
    });
  }

  selectDistrict(district: string): void {
    this.selectedDistrict = district;
    this.locationMessage = '';
    void this.loadHomepage();
  }

  findNearby(): void {
    if (!navigator.geolocation) {
      this.locationMessage = 'Trình duyệt không hỗ trợ xác định vị trí.';
      return;
    }
    this.isLocating = true;
    this.locationMessage = '';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating = false;
        this.selectedDistrict = '';
        this.locationMessage = 'Đã sắp xếp quán theo khoảng cách từ vị trí của bạn.';
        void this.loadHomepage(position.coords.latitude, position.coords.longitude);
      },
      () => {
        this.isLocating = false;
        this.locationMessage = 'Không thể lấy vị trí. Hãy cho phép truy cập vị trí hoặc chọn quận.';
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  formatPrice(price: number | null): string {
    if (price === null) return 'Giá đang cập nhật';
    return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
  }

  openRestaurant(restaurant: HomeRestaurant): void {
    const mapsUrl = restaurant.maps_url
      || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  }
}
