import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface FoodRestaurant {
  id: number;
  name: string;
  address: string;
  image_url: string | null;
  price: number | null;
}

interface FoodSearchItem {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  average_price: number | null;
  average_rating: number;
  review_count: number;
  restaurants: FoodRestaurant[];
}

interface FoodSearchResponse {
  items: FoodSearchItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BoxPercent {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DetectedDish {
  order: number;
  class_id: number;
  class_name: string;
  display_name: string;
  confidence: number;
  color: string;
  bbox: number[];
  box_percent: BoxPercent;
}

interface PredictResponse {
  success: boolean;
  require_retake: boolean;
  message: string;
  image_size: { width: number; height: number };
  total_dishes: number;
  dishes: DetectedDish[];
}

interface SortOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-food-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './food-search.component.html',
})
export class FoodSearchComponent implements OnInit, OnDestroy {
  private readonly apiUrl = 'http://localhost:8000/api/foods';
  private readonly predictUrl = 'http://localhost:8000/predict';
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  searchQuery = '';
  selectedCategory = '';
  selectedSort = 'recommended';
  page = 1;
  readonly pageSize = 12;

  categories: string[] = [];
  categoryError = '';
  readonly sortOptions: SortOption[] = [
    { value: 'recommended', label: 'Được đề xuất nhiều nhất' },
    { value: 'rating', label: 'Đánh giá cao nhất' },
    { value: 'price_asc', label: 'Giá thấp đến cao' },
    { value: 'price_desc', label: 'Giá cao đến thấp' },
  ];

  foods: FoodSearchItem[] = [];
  total = 0;
  totalPages = 0;
  isSearching = false;
  searchError = '';

  pastedImage: File | null = null;
  imagePreviewUrl: string | null = null;
  isAnalyzing = false;
  searchStatus = '';
  predictionResult: PredictResponse | null = null;
  selectedDishOrder: number | null = null;
  hoveredDishOrder: number | null = null;

  private readonly dishNameMap: Record<string, string> = {
    'banh canh': 'Bánh canh',
    'banh chung': 'Bánh chưng',
    'banh cuon': 'Bánh cuốn',
    'banh khot': 'Bánh khọt',
    'banh mi': 'Bánh mì',
    'banh trang': 'Bánh tráng',
    'banh trang tron': 'Bánh tráng trộn',
    'banh xeo': 'Bánh xèo',
    'bo kho': 'Bò kho',
    'bo la lot': 'Bò lá lốt',
    bun: 'Bún',
    'bun bo hue': 'Bún bò Huế',
    'bun cha': 'Bún chả',
    'bun dau': 'Bún đậu',
    'bun mam': 'Bún mắm',
    'bun rieu': 'Bún riêu',
    ca: 'Cá',
    'ca phao': 'Cà pháo',
    canh: 'Canh',
    cha: 'Chả',
    'cha gio': 'Chả giò',
    com: 'Cơm',
    'com tam': 'Cơm tấm',
    'cu kieu': 'Củ kiệu',
    cua: 'Cua',
    'dau hu': 'Đậu hũ',
    'dua chua': 'Dưa chua',
    'goi cuon': 'Gỏi cuốn',
    'heo quay': 'Heo quay',
    'hu tieu': 'Hủ tiếu',
    'kho qua thit': 'Khổ qua nhồi thịt',
    lau: 'Lẩu',
    'long heo': 'Lòng heo',
    mi: 'Mì',
    muc: 'Mực',
    nam: 'Nấm',
    oc: 'Ốc',
    pho: 'Phở',
    salad: 'Salad',
    'thit bo': 'Thịt bò',
    'thit ga': 'Thịt gà',
    'thit heo': 'Thịt heo',
    'thit kho': 'Thịt kho',
    'thit nuong': 'Thịt nướng',
    tom: 'Tôm',
    xoi: 'Xôi',
    'banh beo': 'Bánh bèo',
    'cao lau': 'Cao lầu',
    'mi quang': 'Mì Quảng',
    'com chien duong chau': 'Cơm chiên Dương Châu',
    'bun cha ca': 'Bún chả cá',
    'com chien ga': 'Cơm chiên gà',
    'chao long': 'Cháo lòng',
    'nom hoa chuoi': 'Nộm hoa chuối',
    'nui xao bo': 'Nui xào bò',
    'sup cua': 'Súp cua',
    'com ga hoi an': 'Cơm gà Hội An',
    'kem bo': 'Kem bơ',
    'oc hut': 'Ốc hút',
    'mit tron': 'Mít trộn',
    'be thui': 'Bê thui',
    'banh bot loc': 'Bánh bột lọc',
    'banh trang kep': 'Bánh tráng kẹp',
    'banh trang cuon thit heo': 'Bánh tráng cuốn thịt heo',
  };
  private searchRequestId = 0;
  private predictionRequestId = 0;

  ngOnInit(): void {
    void this.loadCategories();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.searchQuery = params.get('q') ?? '';
        this.page = 1;
        void this.searchFoods();
      });
  }

  async loadCategories(): Promise<void> {
    try {
      this.categories = await firstValueFrom(
        this.http.get<string[]>(`${this.apiUrl}/categories`),
      );
    } catch (error: unknown) {
      this.categories = [];
      this.categoryError =
        error instanceof Error
          ? error.message
          : 'Không thể tải danh mục món ăn.';
    }
  }

  async onSearch(): Promise<void> {
    if (this.pastedImage && !this.predictionResult) {
      await this.analyzeImageWithAI(this.pastedImage);
      return;
    }

    this.page = 1;
    await this.searchFoods();
  }

  async searchFoods(): Promise<void> {
    const requestId = ++this.searchRequestId;
    this.isSearching = true;
    this.searchError = '';

    let params = new HttpParams()
      .set('q', this.searchQuery.trim())
      .set('sort', this.selectedSort)
      .set('page', this.page)
      .set('page_size', this.pageSize);

    if (this.selectedCategory) {
      params = params.set('category', this.selectedCategory);
    }

    try {
      const response = await firstValueFrom(
        this.http.get<FoodSearchResponse>(`${this.apiUrl}/search`, { params }),
      );
      if (requestId !== this.searchRequestId) return;
      this.foods = response.items;
      this.total = response.total;
      this.totalPages = response.total_pages;
    } catch (error: unknown) {
      if (requestId !== this.searchRequestId) return;
      this.foods = [];
      this.total = 0;
      this.totalPages = 0;
      this.searchError =
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách món ăn. Vui lòng thử lại.';
    } finally {
      if (requestId === this.searchRequestId) this.isSearching = false;
    }
  }

  async selectCategory(category: string): Promise<void> {
    this.selectedCategory = category;
    this.page = 1;
    await this.searchFoods();
  }

  async changeSort(sort: string): Promise<void> {
    this.selectedSort = sort;
    this.page = 1;
    await this.searchFoods();
  }

  async changePage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    await this.searchFoods();
  }

  formatDishName(rawClassName: string): string {
    const normalized = rawClassName
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return this.dishNameMap[normalized] || rawClassName;
  }

  async analyzeImageWithAI(imageFile: File): Promise<void> {
    const requestId = ++this.predictionRequestId;
    this.isAnalyzing = true;
    this.searchStatus = 'AI đang phân tích hình ảnh món ăn...';
    this.selectedDishOrder = null;

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const response = await fetch(this.predictUrl, { method: 'POST', body: formData });
      if (requestId !== this.predictionRequestId) return;
      if (!response.ok) {
        const errorBody: { detail?: string } | null = await response
          .json()
          .catch(() => null);
        throw new Error(errorBody?.detail || `Lỗi kết nối máy chủ (${response.status}).`);
      }

      const data: PredictResponse = await response.json();
      if (requestId !== this.predictionRequestId) return;
      data.dishes = data.dishes.map((dish) => ({
        ...dish,
        display_name: this.formatDishName(dish.class_name),
      }));
      this.predictionResult = data;
      this.searchStatus = data.message;

      if (data.success && data.dishes.length > 0) {
        this.searchQuery = data.dishes.map((dish) => dish.display_name).join(', ');
        this.page = 1;
        await this.searchFoods();
      }
    } catch (error: unknown) {
      if (requestId !== this.predictionRequestId) return;
      this.predictionResult = null;
      this.searchStatus =
        error instanceof Error
          ? error.message
          : 'Không thể kết nối tới máy chủ nhận diện ảnh.';
    } finally {
      if (requestId === this.predictionRequestId) this.isAnalyzing = false;
    }
  }

  selectDetectedDish(dish: DetectedDish): void {
    this.selectedDishOrder = this.selectedDishOrder === dish.order ? null : dish.order;
    if (this.selectedDishOrder === null) {
      this.searchQuery = this.predictionResult?.dishes
        .map((item) => item.display_name)
        .join(', ') ?? '';
    } else {
      this.searchQuery = dish.display_name;
    }
    this.page = 1;
    void this.searchFoods();
  }

  isDishHighlighted(order: number): boolean {
    if (this.hoveredDishOrder !== null) return this.hoveredDishOrder === order;
    return this.selectedDishOrder === null || this.selectedDishOrder === order;
  }

  onImageSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const image = input.files?.[0];
    if (image?.type.startsWith('image/')) this.setPastedImage(image);
    input.value = '';
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
      item.type.startsWith('image/'),
    );
    const image = imageItem?.getAsFile();
    if (!image) return;

    event.preventDefault();
    this.setPastedImage(image);
  }

  removePastedImage(): void {
    this.predictionRequestId++;
    this.isAnalyzing = false;
    this.clearImagePreview();
    this.pastedImage = null;
    this.predictionResult = null;
    this.selectedDishOrder = null;
    this.hoveredDishOrder = null;
    this.searchStatus = '';
  }

  ngOnDestroy(): void {
    this.clearImagePreview();
  }

  formatPrice(price: number | null): string {
    if (price === null) return 'Đang cập nhật giá';
    return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
  }

  private setPastedImage(image: File): void {
    this.clearImagePreview();
    this.pastedImage = image;
    this.imagePreviewUrl = URL.createObjectURL(image);
    this.predictionResult = null;
    this.selectedDishOrder = null;
    void this.analyzeImageWithAI(image);
  }

  private clearImagePreview(): void {
    if (!this.imagePreviewUrl) return;
    URL.revokeObjectURL(this.imagePreviewUrl);
    this.imagePreviewUrl = null;
  }
}
