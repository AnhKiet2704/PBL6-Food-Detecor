import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import {Restaurant, SpecialtyTag, StatHighlight} from '../../../../models/admin-models/dashboard/dashboard.model';

interface AdminRestaurantApiItem {
  id: number;
  name: string;
  address: string;
  district: string | null;
  phone: string | null;
  opening_hours: string | null;
  description: string | null;
  image_url: string | null;
  category: string | null;
  price_range: string | null;
  rating: number;
  review_count: number;
  status: string;
  heritage: string | null;
  match_score: number;
  taste_score: number;
}

interface AdminRestaurantPageResponse {
  items: AdminRestaurantApiItem[];
  total: number;
  total_pages: number;
  pending_count: number;
  verified_count: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000/api/admin';

  @Input() searchQuery: string = '';
  currentPage = 1;
  readonly pageSize = 5;
  selectedRestaurantIds = new Set<number>();
  notice = '';
  showAddRestaurantForm = false;
  showEditRestaurantForm = false;
  newRestaurant = { name: '', address: '', category: '', priceRange: '' };
  editRestaurantForm = { name: '', address: '', category: '', priceRange: '' };
  sortByRatingDescending = true;
  isLoadingRestaurants = false;
  restaurantTotal = 0;
  serverTotalPages = 1;

  // --- 1. DỮ LIỆU THỐNG KÊ (STATS) ---
  stats: StatHighlight[] = [
    { label: 'Tổng quán trong cẩm nang', value: '486', trendText: '+12 quán tháng này', trendIcon: 'trending_up', icon: 'storefront', iconBgClass: 'bg-surface-container', iconColorClass: 'text-primary' },
    { label: 'Chuẩn vị bản địa (100%)', value: '412', trendText: 'Chiếm 84.7% danh bạ', trendIcon: '', icon: 'verified', iconBgClass: 'bg-secondary-container/40', iconColorClass: 'text-secondary', iconFill: true },
    { label: 'Đang chờ thẩm định', value: '28', trendText: '5 hồ sơ ưu tiên', trendIcon: 'priority_high', icon: 'pending_actions', iconBgClass: 'bg-tertiary-fixed/30', iconColorClass: 'text-tertiary' },
    { label: 'Điểm số bảo chứng TB', value: '4.74', subValue: '/5.0', trendText: 'Từ 48.2k đánh giá', trendIcon: '', icon: 'stars', iconBgClass: 'bg-primary-fixed', iconColorClass: 'text-primary', iconFill: true },
  ];

  // --- 2. DỮ LIỆU BỘ LỌC & TAGS ---
  districts = [
    'Quận Huyện: Tất cả (Đà Nẵng)',
    'Hải Châu (Trung tâm ẩm thực)',
    'Sơn Trà (Bán đảo & Hải sản)',
    'Ngũ Hành Sơn (Phố Tây & Chay)',
    'Thanh Khê (Món ăn dân dã)',
    'Cẩm Lệ (Bánh tráng cuốn thịt heo)',
    'Liên Chiểu & Hòa Vang'
  ];
  selectedDistrict = this.districts[0];

  statuses = [
    'Trạng thái: Tất cả',
    'Đã xác minh bản địa 100%',
    'Đang chờ thẩm định menu',
    'Cần tái thẩm định hương vị',
    'Tạm đóng cửa / Chuyển vị trí'
  ];
  selectedStatus = this.statuses[0];

  specialtyTags: SpecialtyTag[] = [
    { label: 'Tất cả món', isActive: true },
    { label: '🍜 Mì Quảng Phú Chiêm & Túy Loan', isActive: false },
    { label: '🥞 Bánh xèo nem lụi giòn', isActive: false },
    { label: '🐟 Bún chả cá nước trong', isActive: false },
    { label: '🦐 Hải sản xóm chài Mỹ Khê', isActive: false },
    { label: '🥩 Bánh tráng cuốn thịt heo hai đầu da', isActive: false },
    { label: '🌱 Ẩm thực Chay Đà Thành', isActive: false },
  ];

  // --- 3. DỮ LIỆU DANH SÁCH QUÁN ĂN ---
  restaurants: Restaurant[] = [
    {
      id: 1,
      name: 'Mì Quảng Bà Tư',
      address: '42 Trưng Nữ Vương, Q. Hải Châu',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC21UCafbalHcJr-oquNk6P8u-uhrwSran2zMme-T_V6DVEwtPx1m-wZbLev2osgPJYO6RWgyAMql89Y3RI6HNJJYN5XtX4_lF47CV91uoQj0im8bACPuwUF_h27c7HTatSJKdklM8FP4ZYml2TN5oCfJOpqbTb6knuFcHG3_5JytHU7enZ3xu2OxhnSlGT5Og-_PQLMTC5jnZiuvMSPN8PrkXpnAZZ9D_iiHee4DTkSqIMcnWXBiaU',
      rating: 4.8,
      reviewCount: 326,
      reviewLabel: 'khách địa phương',
      category: 'Mì Quảng tôm thịt trứng',
      priceRange: '35.000đ - 65.000đ',
      secret: 'Bí quyết: Nước nhưn đậm vị',
      matchScore: 92,
      matchLabel: 'Cực kỳ chuẩn',
      status: 'verified',
      heritage: 'Thế hệ thứ 2 • Kế thừa từ năm 1988',
      openHours: '06:00 - 21:00',
      gps: '16.0592° N, 108.2208° E',
      mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwN9CFim78oDj7fT4xEEjp-e_cw_WdMszdckOVkVwAzKgr1ndizE0rNfsGn1jD5Mt2z36ATtl7gpGSfj09w5jJiGYri9Tvd9PqiD_56EKTNbLhCTSZXU69ltqHhB4vjJ-GrLntM2vpnPyP8uf_SdiDGBHaL2BnwxWpG319V5EV8EiZx6yN79wxAkcIZiT53Q5AcsGHAvPvtHac6VP2TWSNINMc6gndCAsPGlaTcm3G-qXrp7WoXyyF',
      ownerName: 'Bà Lê Thị Tươi (Bà Tư)',
      ownerPhone: '0905.284.xxx',
      ownerInitial: 'BT',
      tasteScore: 9.6,
      audits: [
        { date: '12/03/2024', title: 'Vòng 1: Kiểm tra nguồn gốc nước nhưn', description: 'Đạt chuẩn ninh xương heo & nước cốt tôm tự nhiên, không dùng phẩm màu hóa học.' },
        { date: '28/04/2024', title: 'Vòng 2: Phản hồi từ 50 Foodie bản xứ', description: 'Độ hài lòng đạt 96%. Rau sống búp chuối, cải non chuẩn nguồn rau Trà Quế.' }
      ]
    },
    {
      id: 2,
      name: 'Bếp Nhà Mận',
      address: '18 Võ Văn Kiệt, Q. Sơn Trà',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAz3W6Zu4LLyF6vsNteOIN2VnztxNs59p-e65svq_vyUWAlfF4wfhyg1Xvdj3nzOhCNUyO9xP95eJ0Ny-nPENNY3D6zc6IOC3PDXgmixg2jCB-vrF3IJ_-gLlM0Ouvp4GcYJeJ8yxKXqfSIZCNQ9gqtWkg1Ok6yMqPjG9UMZJqbL6dyysWJQWtKzK-SXejPqociXqg6K7pz-q6G4TlMbzHIwoC6L3PsUVzhRmd7sSOoi_X-sDrGsThR',
      rating: 4.7,
      reviewCount: 218,
      reviewLabel: 'khách',
      category: 'Bánh xèo tôm nhảy & Nem lụi',
      priceRange: '45.000đ - 90.000đ',
      secret: 'Vỏ giòn không dầu mỡ',
      matchScore: 89,
      matchLabel: 'Yêu thích cao',
      status: 'verified',
      heritage: 'Hoạt động từ năm 2015',
      openHours: '10:00 - 22:00',
      gps: '16.0611° N, 108.2322° E',
      mapImage: '',
      ownerName: 'Chị Mận',
      ownerPhone: '0935.123.xxx',
      ownerInitial: 'M',
      tasteScore: 8.9,
      audits: []
    },
    {
      id: 3,
      name: 'Bún Cá Cô Năm',
      address: '109 Nguyễn Chí Thanh, Hải Châu',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi58okhH-U3tanhgsQyonZPwj0O4QyU-6Vou9Ff_kRW6eyENrPhTY8ALwLWxyomz_41Mw5M54MJ6HTVavKROwGzksY4DxhEgfEx9eT-37V9WxeQ0pY-nPBnymon1zg5r262s52CdWcrKBpmaUYjLR0xKOoZ0RRGCIPDLmKGtNXDJkj0kRQFJ9gYbc7VAa4ua3AvKJ8T94kWPEPlwVE3aSpDiBWuvyINj3eEi9AzAxggriX19aYCVl8',
      rating: 4.6,
      reviewCount: 174,
      reviewLabel: 'khách',
      category: 'Bún chả cá thu & cá ngừ',
      priceRange: '35.000đ - 55.000đ',
      secret: 'Nước dùng ngọt rau củ quả',
      matchScore: 88,
      matchLabel: 'Truyền thống',
      status: 'verified',
      heritage: 'Gia truyền 2 đời',
      openHours: '05:30 - 13:00',
      gps: '16.0682° N, 108.2238° E',
      mapImage: '',
      ownerName: 'Cô Năm',
      ownerPhone: '0912.456.xxx',
      ownerInitial: 'N',
      tasteScore: 8.8,
      audits: []
    },
    {
      id: 5,
      name: 'Quán Chay An Nhiên',
      address: '78 Châu Thị Vĩnh Tế, Ngũ Hành Sơn',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUyvgPoYQek0RvB07GRWXRFwY5CYzQ_s2QkEOW2Gyyf8698aycBbuYQUmvmjPUiQnn0_Ynjh8MtYdOxsSeQKSpvdyMMBK3PRTQp2t4ERA83qqTDNmdfwHuUYP0oEHuZMkUJG8VlVtmYupyb9JwiOJd8YsI1vHaWCah43UDwD1gHnXdOtOBKWFEJQtuG1h2TsLPvrKL7yTtewybNgyZNTF61CFxNvUP11t2ajH9UtEAQelyXyWLhyAi',
      rating: 4.7,
      reviewCount: 145,
      reviewLabel: 'khách bản xứ',
      category: 'Lẩu nấm & Cơm chay thực dưỡng',
      priceRange: '30.000đ - 70.000đ',
      secret: 'Nguyên liệu rau củ organic',
      matchScore: 84,
      matchLabel: 'Đang test vị',
      status: 'pending',
      heritage: 'Mới mở 2023',
      openHours: '07:00 - 20:00',
      gps: '16.0355° N, 108.2431° E',
      mapImage: '',
      ownerName: 'Nguyễn Văn An',
      ownerPhone: '0988.999.xxx',
      ownerInitial: 'A',
      tasteScore: 8.4,
      audits: []
    }
  ];

  selectedRestaurant: Restaurant | null = null;

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchQuery = params.get('q') ?? '';
      this.onFiltersChanged();
    });
    // Select default restaurant
    if (this.restaurants.length > 0) {
      this.selectedRestaurant = this.restaurants[0];
    }
  }

  // --- 4. LOGIC METHODS ---
  get filteredRestaurants(): Restaurant[] {
    return this.restaurants;
  }

  get pagedRestaurants(): Restaurant[] {
    return this.restaurants;
  }

  get totalPages(): number {
    return Math.max(1, this.serverTotalPages);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get pageStart(): number {
    return this.restaurantTotal ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.restaurantTotal);
  }

  get selectedCount(): number {
    return this.selectedRestaurantIds.size;
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    void this.loadRestaurants();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      void this.loadRestaurants();
    }
  }

  toggleRestaurantSelection(id: number, selected: boolean): void {
    if (selected) this.selectedRestaurantIds.add(id);
    else this.selectedRestaurantIds.delete(id);
  }

  togglePageSelection(selected: boolean): void {
    for (const restaurant of this.pagedRestaurants) {
      this.toggleRestaurantSelection(restaurant.id, selected);
    }
  }

  onPageSelectionChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.togglePageSelection(target.checked);
  }

  onRestaurantSelectionChange(id: number, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.toggleRestaurantSelection(id, target.checked);
    }
  }

  isPageSelected(): boolean {
    return this.pagedRestaurants.length > 0 &&
      this.pagedRestaurants.every((restaurant) => this.selectedRestaurantIds.has(restaurant.id));
  }

  toggleSort(): void {
    this.sortByRatingDescending = !this.sortByRatingDescending;
  }

  reviewRestaurant(restaurant: Restaurant, approved: boolean): void {
    if (approved) {
      void this.updateRestaurantStatus(restaurant, 'verified');
      return;
    }
    void this.updateRestaurantStatus(restaurant, 'rejected');
  }

  openEditRestaurantForm(): void {
    if (!this.selectedRestaurant) return;
    this.editRestaurantForm = {
      name: this.selectedRestaurant.name,
      address: this.selectedRestaurant.address,
      category: this.selectedRestaurant.category,
      priceRange: this.selectedRestaurant.priceRange,
    };
    this.notice = '';
    this.showEditRestaurantForm = true;
  }

  saveRestaurantChanges(): void {
    if (!this.selectedRestaurant) return;
    const { name, address, category, priceRange } = this.editRestaurantForm;
    if (!name.trim() || !address.trim() || !category.trim()) {
      this.notice = 'Vui lòng nhập tên quán, địa chỉ và món đặc sản.';
      return;
    }
    void this.saveRestaurantToApi(this.selectedRestaurant.id, {
      name: name.trim(),
      address: address.trim(),
      category: category.trim(),
      price_range: priceRange.trim() || null,
    });
  }

  toggleRestaurantStatus(): void {
    if (!this.selectedRestaurant) return;
    void this.updateRestaurantStatus(
      this.selectedRestaurant,
      this.selectedRestaurant.status === 'verified' ? 'pending' : 'verified',
    );
  }

  addRestaurant(): void {
    const { name, address, category, priceRange } = this.newRestaurant;
    if (!name.trim() || !address.trim() || !category.trim()) {
      this.notice = 'Vui lòng nhập tên quán, địa chỉ và món đặc sản.';
      return;
    }
    void this.createRestaurantInApi({
      name: name.trim(),
      address: address.trim(),
      category: category.trim(),
      price_range: priceRange.trim() || null,
    });
  }

  exportRestaurants(): void {
    const headers = ['Tên quán', 'Địa chỉ', 'Đặc sản', 'Giá', 'Đánh giá', 'Trạng thái'];
    const rows = this.filteredRestaurants.map((item) => [
      item.name, item.address, item.category, item.priceRange, String(item.rating), item.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    this.downloadFile('\uFEFF' + csv, 'danh-ba-quan-an.csv', 'text/csv;charset=utf-8');
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private downloadFile(content: string, fileName: string, type: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  selectSpot(restaurant: Restaurant) {
    this.selectedRestaurant = restaurant;
  }

  setSpecialtyTag(selectedTag: SpecialtyTag) {
    this.specialtyTags.forEach(tag => tag.isActive = false);
    selectedTag.isActive = true;
    this.currentPage = 1;
    void this.loadRestaurants();
  }

  private async loadRestaurants(): Promise<void> {
    this.isLoadingRestaurants = true;
    const activeTag = this.specialtyTags.find((tag) => tag.isActive)?.label ?? '';
    const category = this.categoryFilter(activeTag);
    const district = this.selectedDistrict === this.districts[0]
      ? ''
      : this.selectedDistrict.split(' (')[0];
    const status = this.statusFilter(this.selectedStatus);
    let params = new HttpParams()
      .set('q', this.searchQuery.trim())
      .set('sort', this.sortByRatingDescending ? 'rating_desc' : 'rating_asc')
      .set('page', this.currentPage)
      .set('page_size', this.pageSize);
    if (district) params = params.set('district', district);
    if (category) params = params.set('category', category);
    if (status) params = params.set('status', status);

    try {
      const response = await firstValueFrom(
        this.http.get<AdminRestaurantPageResponse>(`${this.apiUrl}/restaurants`, { params }),
      );
      this.restaurants = response.items.map((item) => this.mapRestaurant(item));
      this.restaurantTotal = response.total;
      this.serverTotalPages = response.total_pages;
      this.selectedRestaurant = this.restaurants.find(
        (restaurant) => restaurant.id === this.selectedRestaurant?.id,
      ) ?? this.restaurants[0] ?? null;
      this.stats[0].value = String(response.total);
      this.stats[1].value = String(response.verified_count);
      this.stats[2].value = String(response.pending_count);
    } catch (error: unknown) {
      this.restaurants = [];
      this.restaurantTotal = 0;
      this.serverTotalPages = 1;
      this.selectedRestaurant = null;
      this.notice = error instanceof Error
        ? error.message
        : 'Không thể tải dữ liệu quán ăn từ máy chủ.';
    } finally {
      this.isLoadingRestaurants = false;
    }
  }

  private mapRestaurant(item: AdminRestaurantApiItem): Restaurant {
    return {
      id: item.id,
      name: item.name,
      address: item.address,
      image: item.image_url ?? '',
      rating: item.rating,
      reviewCount: item.review_count,
      reviewLabel: 'đánh giá',
      category: item.category ?? 'Chưa phân loại',
      priceRange: item.price_range ?? 'Đang cập nhật',
      secret: item.description ?? 'Chưa có mô tả',
      matchScore: item.match_score,
      matchLabel: item.match_score ? 'Điểm xác minh' : 'Chưa chấm điểm',
      status: this.normalizeRestaurantStatus(item.status),
      heritage: item.heritage ?? 'Chưa có thông tin kiểm định',
      openHours: item.opening_hours ?? 'Chưa cập nhật',
      gps: 'Chưa cập nhật',
      mapImage: '',
      ownerName: 'Chưa cập nhật',
      ownerPhone: item.phone ?? 'Chưa cập nhật',
      ownerInitial: item.name.charAt(0).toUpperCase(),
      tasteScore: item.taste_score,
      audits: [],
    };
  }

  private categoryFilter(label: string): string {
    const normalized = this.normalize(label);
    if (!normalized || normalized.startsWith('tat ca')) return '';
    if (normalized.includes('mi quang')) return 'Mì Quảng';
    if (normalized.includes('banh xeo')) return 'Bánh xèo';
    if (normalized.includes('bun cha ca')) return 'Bún chả cá';
    if (normalized.includes('hai san')) return 'Hải sản';
    if (normalized.includes('banh trang')) return 'Bánh tráng';
    if (normalized.includes('chay')) return 'Chay';
    return '';
  }

  private statusFilter(label: string): string {
    if (label === this.statuses[1]) return 'verified';
    if (label === this.statuses[2]) return 'pending';
    if (label === this.statuses[3]) return 'rejected';
    if (label === this.statuses[4]) return 'closed';
    return '';
  }

  private normalizeRestaurantStatus(status: string): Restaurant['status'] {
    return status === 'verified' || status === 'rejected' || status === 'closed'
      ? status
      : 'pending';
  }

  private async createRestaurantInApi(payload: object): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/restaurants`, payload));
      this.newRestaurant = { name: '', address: '', category: '', priceRange: '' };
      this.showAddRestaurantForm = false;
      this.notice = 'Đã thêm quán vào danh sách chờ thẩm định.';
      this.currentPage = 1;
      await this.loadRestaurants();
    } catch (error: unknown) {
      this.notice = error instanceof Error ? error.message : 'Không thể thêm hồ sơ quán.';
    }
  }

  private async saveRestaurantToApi(id: number, payload: object): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${this.apiUrl}/restaurants/${id}`, payload));
      this.showEditRestaurantForm = false;
      this.notice = 'Đã lưu thay đổi hồ sơ quán.';
      await this.loadRestaurants();
    } catch (error: unknown) {
      this.notice = error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ quán.';
    }
  }

  private async updateRestaurantStatus(restaurant: Restaurant, status: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/restaurants/${restaurant.id}/status`, { status }),
      );
      this.notice = `Đã cập nhật trạng thái ${restaurant.name}.`;
      await this.loadRestaurants();
    } catch (error: unknown) {
      this.notice = error instanceof Error ? error.message : 'Không thể cập nhật trạng thái quán.';
    }
  }
}
