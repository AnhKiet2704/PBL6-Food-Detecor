import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';

interface ApiMenuItem {
  food_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  category: string | null;
}

interface ApiReview {
  id: number;
  author: string;
  rating: number;
  comment: string;
  food_name: string;
  created_at: string | null;
}

interface ApiRestaurant {
  id: number;
  name: string;
  slug: string;
  address: string;
  district: string | null;
  phone: string | null;
  opening_hours: string | null;
  description: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  verified_at: string | null;
  price_min: number | null;
  price_max: number | null;
  average_rating: number;
  review_count: number;
  gallery: string[];
  menu: ApiMenuItem[];
  reviews: {
    items: ApiReview[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  similar_restaurants: Array<{
    id: number;
    name: string;
    image_url: string | null;
    average_rating: number;
    distance_km: number | null;
    min_price: number | null;
  }>;
}

interface GalleryImage {
  src: string;
  alt: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  priceRange: string;
  image: string;
  badge?: string;
  badgeBgClass?: string;
}

interface ReviewItem {
  id: number;
  author: string;
  authorInitial: string;
  avatarBgClass: string;
  avatarTextClass: string;
  authorInfo: string;
  rating: number;
  content: string;
  helpfulCount: number;
  foodName: string;
  createdAt: string | null;
}

interface RestaurantDetailData {
  id: number;
  name: string;
  district: string;
  city: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  openingHoursText: string;
  verifiedDate: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  gallery: {
    mainImage: GalleryImage;
    subImages: GalleryImage[];
    totalPhotosCount: number;
  };
  weeklySchedule: { day: string; hours: string; isToday?: boolean }[];
  amenities: { iconClass: string; label: string }[];
  featuredMenu: MenuItem[];
  aspectRatings: { label: string; score: number; percentage: number }[];
  insiderTip: string;
  itinerary: { time: string; title: string; note?: string; isActive?: boolean }[];
  similarRestaurants: {
    id: number;
    name: string;
    image: string;
    rating: number;
    distance: string;
    priceRange: string;
  }[];
  reviews: ReviewItem[];
}

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurant-detail.component.html',
})
export class RestaurantDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = 'http://localhost:8000/api/restaurants';
  private restaurantId = 0;
  private requestId = 0;

  restaurant: RestaurantDetailData | null = null;
  isLoading = true;
  errorMessage = '';
  reviewNotice = '';
  saveNotice = '';
  isSavingRestaurant = false;
  showReviewForm = false;
  isSubmittingReview = false;
  reviewPage = 1;
  reviewTotalPages = 0;
  readonly reviewPageSize = 6;
  reviewForm = { foodId: 0, rating: 5, comment: '' };
  readonly ratings = [5, 4, 3, 2, 1];

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.restaurantId = Number.isSafeInteger(id) && id > 0 ? id : 0;
      this.reviewPage = 1;
      this.restaurant = null;
      void this.loadRestaurant();
    });
  }

  async loadRestaurant(page = this.reviewPage): Promise<void> {
    if (!this.restaurantId) {
      this.isLoading = false;
      this.errorMessage = 'Đường dẫn quán ăn không hợp lệ.';
      return;
    }
    const requestId = ++this.requestId;
    this.isLoading = true;
    this.errorMessage = '';
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', this.reviewPageSize);
    try {
      const data = await firstValueFrom(
        this.http.get<ApiRestaurant>(`${this.apiUrl}/${this.restaurantId}`, { params }),
      );
      if (requestId !== this.requestId) return;
      this.restaurant = this.mapRestaurant(data);
      this.reviewPage = data.reviews.page;
      this.reviewTotalPages = data.reviews.total_pages;
      if (!this.reviewForm.foodId && data.menu.length > 0) {
        this.reviewForm.foodId = data.menu[0].food_id;
      }
    } catch (error: unknown) {
      if (requestId !== this.requestId) return;
      this.restaurant = null;
      this.errorMessage = error instanceof Error
        ? error.message
        : 'Không thể tải thông tin quán ăn. Vui lòng thử lại.';
    } finally {
      if (requestId === this.requestId) this.isLoading = false;
    }
  }

  setReviewPage(page: number): void {
    if (page < 1 || page > this.reviewTotalPages || page === this.reviewPage) return;
    this.reviewPage = page;
    void this.loadRestaurant(page);
    document.getElementById('restaurant-reviews')?.scrollIntoView({ behavior: 'smooth' });
  }

  async submitReview(): Promise<void> {
    if (!this.restaurant || !this.reviewForm.foodId || !this.reviewForm.comment.trim()) {
      this.reviewNotice = 'Vui lòng chọn món và nhập nội dung đánh giá.';
      return;
    }
    const token = localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token');
    if (!token) {
      this.reviewNotice = 'Vui lòng đăng nhập để gửi đánh giá.';
      return;
    }

    this.isSubmittingReview = true;
    this.reviewNotice = '';
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/${this.restaurant.id}/reviews`, {
          food_id: this.reviewForm.foodId,
          rating: this.reviewForm.rating,
          comment: this.reviewForm.comment.trim(),
        }),
      );
      this.reviewForm.comment = '';
      this.reviewForm.rating = 5;
      this.showReviewForm = false;
      this.reviewPage = 1;
      this.reviewNotice = 'Cảm ơn bạn đã chia sẻ trải nghiệm!';
      await this.loadRestaurant(1);
    } catch (error: unknown) {
      this.reviewNotice = error instanceof Error
        ? error.message
        : 'Không thể gửi đánh giá. Vui lòng thử lại.';
    } finally {
      this.isSubmittingReview = false;
    }
  }

  async shareRestaurant(): Promise<void> {
    const url = window.location.href;
    try {
      if (navigator.share && this.restaurant) {
        await navigator.share({ title: this.restaurant.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        this.reviewNotice = 'Đã sao chép liên kết quán ăn.';
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        this.reviewNotice = 'Không thể chia sẻ liên kết trên thiết bị này.';
      }
    }
  }

  async saveRestaurant(): Promise<void> {
    if (!this.restaurant || this.isSavingRestaurant) return;
    if (!this.authService.isLoggedIn()) {
      this.saveNotice = 'Vui lòng đăng nhập để lưu quán.';
      return;
    }

    this.isSavingRestaurant = true;
    this.saveNotice = '';
    try {
      await firstValueFrom(
        this.http.put<{ saved: boolean }>(
          `${this.apiUrl}/${this.restaurant.id}/favorite`,
          null,
        ),
      );
      this.saveNotice = 'Đã lưu quán vào danh sách của bạn.';
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && typeof error.error?.detail === 'string') {
        this.saveNotice = error.error.detail;
      } else {
        this.saveNotice = 'Không thể lưu quán. Vui lòng thử lại.';
      }
    } finally {
      this.isSavingRestaurant = false;
    }
  }

  directionsUrl(): string {
    if (!this.restaurant) return 'https://www.google.com/maps';
    const query = this.restaurant.latitude !== null && this.restaurant.longitude !== null
      ? `${this.restaurant.latitude},${this.restaurant.longitude}`
      : this.restaurant.address;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  mapEmbedUrl(): SafeResourceUrl | null {
    if (
      !this.restaurant ||
      this.restaurant.latitude === null ||
      this.restaurant.longitude === null
    ) {
      return null;
    }
    const latitude = this.restaurant.latitude;
    const longitude = this.restaurant.longitude;
    const bbox = [
      longitude - 0.008,
      latitude - 0.005,
      longitude + 0.008,
      latitude + 0.005,
    ].join('%2C');
    const marker = `${latitude}%2C${longitude}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`,
    );
  }

  formatPrice(price: number | null): string {
    if (price === null) return 'Chưa cập nhật giá';
    return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
  }

  private mapRestaurant(data: ApiRestaurant): RestaurantDetailData {
    const images = data.gallery.length > 0
      ? data.gallery
      : [''];
    const mainImage = images[0];
    return {
      id: data.id,
      name: data.name,
      district: data.district || 'Đà Nẵng',
      city: 'Đà Nẵng',
      rating: data.average_rating,
      reviewCount: data.review_count,
      priceRange: data.price_min !== null && data.price_max !== null
        ? `${this.formatPrice(data.price_min)} – ${this.formatPrice(data.price_max)}`
        : 'Chưa cập nhật giá',
      openingHoursText: data.opening_hours || 'Chưa cập nhật',
      verifiedDate: data.verified_at
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(data.verified_at))
        : 'Đã xác minh',
      address: data.address,
      phone: data.phone || '',
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description || 'Quán ăn địa phương tại Đà Nẵng.',
      gallery: {
        mainImage: { src: mainImage, alt: data.name },
        subImages: images.slice(1, 5).map((src, index) => ({
          src,
          alt: `Ảnh ${index + 2} của ${data.name}`,
        })),
        totalPhotosCount: images.length,
      },
      weeklySchedule: data.opening_hours
        ? [{ day: 'Giờ hoạt động', hours: data.opening_hours }]
        : [],
      amenities: [],
      featuredMenu: data.menu.map((item, index) => ({
        id: item.food_id,
        name: item.name,
        description: item.description || 'Món ăn đang được phục vụ tại quán.',
        priceRange: this.formatPrice(item.price),
        image: item.image_url || '',
        badge: index === 0 ? 'Món trong menu' : undefined,
      })),
      aspectRatings: [],
      insiderTip: data.description || 'Thông tin do quán cung cấp.',
      itinerary: [],
      similarRestaurants: data.similar_restaurants.map((item) => ({
        id: item.id,
        name: item.name,
        image: item.image_url || '',
        rating: item.average_rating,
        distance: item.distance_km === null ? 'cùng khu vực' : `${item.distance_km} km`,
        priceRange: this.formatPrice(item.min_price),
      })),
      reviews: data.reviews.items.map((item) => ({
        id: item.id,
        author: item.author,
        authorInitial: item.author.trim().slice(0, 2).toLocaleUpperCase('vi') || 'TK',
        avatarBgClass: 'bg-orange-100',
        avatarTextClass: 'text-[#EE5A36]',
        authorInfo: `${item.food_name}${item.created_at ? ` · ${new Intl.DateTimeFormat('vi-VN').format(new Date(item.created_at))}` : ''}`,
        rating: item.rating,
        content: item.comment,
        helpfulCount: 0,
        foodName: item.food_name,
        createdAt: item.created_at,
      })),
    };
  }
}
