import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// ==========================================
// 1. ĐỊNH NGHĨA MODEL TƯƠNG THÍCH VỚI SQL DB
// ==========================================

export interface AiMetric {
  title: string;
  icon: string; // Đã đổi sang Font Awesome class
  iconColor: string;
  iconBg: string;
  value: string;
  unit?: string;
  trendText?: string;
  trendIcon?: string; // Font Awesome
  progressValue?: number;
  hasSparkline?: boolean;
  isAlert?: boolean;
  subtitle: string;
  subtitleIcon?: string; // Font Awesome
  progressBg?: string;
}

export interface FoodIngredient {
  name: string;
  percent: number;
}

export interface VenueMatch {
  restaurant_id: number; // Khớp với bảng restaurants
  name: string;
  address: string;
  score: number;
}

export interface AiPrediction {
  food_id: number; // Khớp với bảng foods
  title: string;
  desc: string;
  matchScore: number;
  venueMatch: VenueMatch;
  altSuggestion: string;
}

export interface AiSample {
  id: string; // Hoặc ID tạm thời của ảnh upload
  timeUpload: string;
  image: string;
  device: string;
  location: string;
  resolution: string;
  gps: string;
  detectionCount: number;
  aiPrediction: AiPrediction;
  ingredients: FoodIngredient[];
  // Cho phần list hàng đợi
  score: number;
  title: string;
  subtitle: string;
  scoreBg?: string;
  statusClass?: string;
  status?: string;
}

export interface Pillar {
  id: string;
  title: string;
  icon: string; // Dùng làm text hoặc Font Awesome
  iconColor: string;
  iconBg: string;
  weight: string;
  description: string;
  tags: string[];
}

export interface DashboardData {
  metrics: AiMetric[];
  queue: AiSample[];
  pillars: Pillar[];
}

// ==========================================
// 2. MOCK API SERVICE (Sẵn sàng nối Backend)
// ==========================================
export class AiModerationService {
  // Thay thế hàm này bằng HttpClient khi có API thật.
  // Ví dụ: return this.http.get<DashboardData>('/api/admin/vision-queue');
  getModerationData(): Observable<DashboardData> {
    return of({
      metrics: [
        {
          title: 'Tổng ảnh chờ duyệt', icon: 'fa-solid fa-images', iconColor: 'text-primary', iconBg: 'bg-primary-container/30',
          value: '1,248', trendText: '+12% tuần này', trendIcon: 'fa-solid fa-arrow-trend-up',
          hasSparkline: true, isAlert: false, subtitle: 'Cập nhật realtime từ người dùng'
        },
        {
          title: 'Độ chính xác AI (Top-1)', icon: 'fa-solid fa-bullseye', iconColor: 'text-secondary', iconBg: 'bg-secondary-container/30',
          value: '94.5', unit: '%', progressValue: 94.5, progressBg: 'bg-secondary',
          isAlert: false, subtitle: 'Tăng 2.1% so với Model V3.1'
        },
        {
          title: 'Tỷ lệ gán quán (Venue)', icon: 'fa-solid fa-store', iconColor: 'text-tertiary', iconBg: 'bg-tertiary-container/30',
          value: '82.0', unit: '%', progressValue: 82.0, progressBg: 'bg-tertiary',
          isAlert: false, subtitle: 'Nhận diện trùng khớp GPS'
        },
        {
          title: 'Cảnh báo rác / Spam', icon: 'fa-solid fa-triangle-exclamation', iconColor: 'text-error', iconBg: 'bg-error-container/30',
          value: '86', trendText: 'Cần chú ý', trendIcon: 'fa-solid fa-circle-exclamation',
          isAlert: true, subtitle: 'Phát hiện ảnh không phải thức ăn', subtitleIcon: 'Cảnh báo tự động'
        }
      ],
      queue: [
        {
          id: 'IMG_8832_RAW', timeUpload: '2 phút trước',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4ngjPYrf0hYdGAsKzE9NXUPbTur3jmrjXUZ5JLY5FnS-rjqixhyC2QJgAZjSC8fr-GES9Ew4BrH4Gb2_Tlg9Zdk3BcDRazjB7rmAgP7EjVQIeRjAkxJOUSJUNbB5chjxWesDf5pn22-Yar_h24bKBIzNWQptWt6p9-yIN1_GkLMLQuAj-WbTveLtOeEu58NIJCtN4yC6PFD01lJ2P94gHxw5n9GZAM3uQKM0pWn0',
          device: 'iPhone 14 Pro', location: 'Đà Nẵng', resolution: '4032 x 3024', gps: '16.0597° N, 108.2155° E', detectionCount: 5,
          ingredients: [
            { name: 'Sợi mì nghệ', percent: 45 }, { name: 'Tôm đất', percent: 20 },
            { name: 'Thịt xíu', percent: 15 }, { name: 'Bánh tráng nướng', percent: 10 }, { name: 'Rau sống', percent: 10 }
          ],
          aiPrediction: {
            food_id: 1, // Khớp với ID trong bảng `foods`
            title: 'Mì Quảng Tôm Thịt',
            desc: 'Nhận diện sợi mì vàng đặc trưng, nước lèo xâm xấp và bánh tráng nướng. Đạt chuẩn món ăn bản địa.',
            matchScore: 98, altSuggestion: 'Mì Quảng Gà (82%)',
            venueMatch: { restaurant_id: 10, name: 'Mì Quảng Bà Vị', address: '166 Lê Đình Dương, Hải Châu', score: 96 } // Bảng `restaurants`
          },
          score: 98, scoreBg: 'bg-primary text-on-primary', title: 'Mì Quảng Tôm Thịt', subtitle: 'Tự tin cao', status: 'Chờ duyệt', statusClass: 'bg-surface-container-high text-on-surface-variant'
        },
        {
          id: 'IMG_0921_HDR', timeUpload: '5 phút trước',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeRt3zm0FAQUM-k3v6H-4jydHYLxRdtTbvLHNe_ocIocur45Pn8YrEX9zAWR5LWM1TvycmzACMsvRLCyTlesdmfTQH7Zt4_7aegxiCMixfb3EYirfCwYQaXV8aBO3VubDZvqgj-X9WembVSpxe2npdFOvETD7_5qsRJnOCRkLtn68jpqGgYwJ1mrGNjEvcA9VaIRd6DMB0ykMoMRSgMt_1Iu1nFZCt0lReb0Tu0Zo',
          device: 'Samsung S23', location: 'Hải Châu, ĐN', resolution: '3000 x 4000', gps: '16.0682° N, 108.2213° E', detectionCount: 3,
          ingredients: [
            { name: 'Thịt heo luộc', percent: 50 }, { name: 'Mắm nêm', percent: 20 }, { name: 'Rau sống', percent: 30 }
          ],
          aiPrediction: {
            food_id: 2, title: 'Bánh Tráng Cuốn Thịt Heo',
            desc: 'Thịt heo hai đầu da luộc, chén mắm nêm nguyên chất và mâm rau rừng.',
            matchScore: 95, altSuggestion: 'Bún Mắm Nêm (70%)',
            venueMatch: { restaurant_id: 15, name: 'Quán Trần', address: '4 Lê Duẩn, Hải Châu', score: 92 }
          },
          score: 95, scoreBg: 'bg-secondary text-on-secondary', title: 'Bánh Tráng Cuốn Thịt Heo', subtitle: 'Hợp lệ', status: 'Chờ duyệt', statusClass: 'bg-surface-container-high text-on-surface-variant'
        },
        {
          id: 'IMG_4410_JPG', timeUpload: '10 phút trước',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAor80OigOeRCn7G8Hjn4vn-DVlAdVTCOUXY2qNyxvuCjKaLSvqfGBV1xOhbewUUhEQ9hNxzSRqpgFtA6xJUu7Vr4wlTh4tNsWS6Z8FclYMP8pAr5027_dumLYEtFFA87D_17rwG7mHmB0qiti2rX1soYmfRv9G5oBcWcl0-3BrQqnu_VknsqsHPYQVWBMDYGbG4T_9y7KWT3DVeHqVbIvx-evBOX1zF44UfR1LJY',
          device: 'Nikon Zfc', location: 'Sơn Trà, ĐN', resolution: '6000 x 4000', gps: '16.0711° N, 108.2322° E', detectionCount: 4,
          ingredients: [
            { name: 'Nước cốt dừa', percent: 40 }, { name: 'Sầu riêng', percent: 30 }, { name: 'Thạch', percent: 20 }, { name: 'Mít', percent: 10 }
          ],
          aiPrediction: {
            food_id: 3, title: 'Chè Sầu Liên',
            desc: 'Món tráng miệng có sầu riêng xay nhuyễn, nước cốt dừa và thạch.',
            matchScore: 91, altSuggestion: 'Chè Thái (85%)',
            venueMatch: { restaurant_id: 21, name: 'Chè Liên', address: '189 Hoàng Diệu, Hải Châu', score: 88 }
          },
          score: 91, scoreBg: 'bg-secondary text-on-secondary', title: 'Chè Sầu Liên', subtitle: 'Cần check', status: 'Chờ duyệt', statusClass: 'bg-surface-container-high text-on-surface-variant'
        }
      ],
      pillars: [
        { id: '1', title: 'Hương Vị Nguyên Bản', icon: '1', iconBg: 'bg-primary-container', iconColor: 'text-on-primary-container', weight: '40%', description: 'Nước dùng, nguyên liệu và cách tẩm ướp phải giữ được đặc trưng truyền thống của người bản địa.', tags: ['Mắm nêm', 'Ớt sừng', 'Gia vị địa phương'] },
        { id: '2', title: 'Nguồn Gốc Nguyên Liệu', icon: '2', iconBg: 'bg-secondary-container', iconColor: 'text-on-secondary-container', weight: '25%', description: 'Sử dụng rau sống Trà Quế, cá tươi sông Hàn, hải sản đánh bắt trong ngày tại cảng Thọ Quang.', tags: ['Tươi sống', 'Truy xuất nguồn gốc'] },
        { id: '3', title: 'Vệ Sinh An Toàn', icon: '3', iconBg: 'bg-tertiary-container', iconColor: 'text-on-tertiary-container', weight: '20%', description: 'Khu vực bếp mở, dụng cụ chế biến sạch sẽ, không dùng chất bảo quản công nghiệp.', tags: ['Bếp sạch', 'An toàn thực phẩm'] },
        { id: '4', title: 'Giá Trị Lịch Sử', icon: '4', iconBg: 'bg-surface-variant', iconColor: 'text-on-surface-variant', weight: '15%', description: 'Ưu tiên các quán gia truyền từ 2 đời trở lên hoặc lưu giữ công thức cổ truyền xứ Quảng.', tags: ['Gia truyền', 'Văn hoá'] }
      ]
    }).pipe(delay(500));
  }

  // Hàm gọi API thực tế để lưu dữ liệu đã duyệt vào Database
  approveImageToDatabase(sample: AiSample): Observable<any> {
    // API thực tế sẽ insert vào bảng `food_images`
    // payload: { food_id: sample.aiPrediction.food_id, image_url: sample.image, restaurant_id: sample.aiPrediction.venueMatch.restaurant_id }
    return of({ success: true }).pipe(delay(300));
  }
}

// ==========================================
// 3. COMPONENT CHÍNH
// ==========================================
@Component({
  selector: 'app-ai-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [AiModerationService],
  templateUrl: './ai-moderation.component.html'
})
export class AiModerationComponent implements OnInit {
  confidenceThreshold = 80;
  notice = '';

  metrics: AiMetric[] = [];
  pillars: Pillar[] = [];
  apiQueue: AiSample[] = [];

  activeSample: AiSample | null = null;
  sampleHistory: AiSample[] = [];

  queuePosition = 0;
  queueTotal = 0;
  isLoading = false;
  isSaving = false;

  isEditingLabel = false;
  editedLabel = '';
  isAssigningVenue = false;
  editedVenue = '';

  constructor(private aiService: AiModerationService) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading = true;
    this.aiService.getModerationData().subscribe({
      next: res => {
        this.metrics = res.metrics;
        this.pillars = res.pillars;
        this.apiQueue = [...res.queue];
        this.queueTotal = res.queue.length;
        this.sampleHistory = [];
        this.queuePosition = this.apiQueue.length > 0 ? 1 : 0;
        this.activeSample = this.apiQueue.shift() ?? null;
        this.isLoading = false;
      },
      error: err => {
        console.error('Không thể tải dữ liệu kiểm duyệt:', err);
        this.showToast('Không thể tải dữ liệu kiểm duyệt. Vui lòng thử lại.');
        this.isLoading = false;
      }
    });
  }

  get ingredients(): FoodIngredient[] {
    return this.activeSample?.ingredients ?? [];
  }

  get visibleUpcomingSamples(): AiSample[] {
    return this.apiQueue
      .filter(sample => sample.score >= this.confidenceThreshold)
      .slice(0, 3);
  }

  get queueExhausted(): boolean {
    return this.activeSample === null;
  }

  decideSample(action: 'approved' | 'rejected'): void {
    const sample = this.activeSample;
    if (!sample || this.isSaving) return;

    if (action === 'approved') {
      this.isSaving = true;
      this.aiService.approveImageToDatabase(sample).subscribe({
        next: () => {
          this.showToast(`Đã lưu ảnh vào CSDL (Food ID: ${sample.aiPrediction.food_id})`);
          this.isSaving = false;
          this.moveToNext();
        },
        error: err => {
          console.error('Không thể duyệt ảnh:', err);
          this.showToast('Lưu ảnh thất bại. Vui lòng thử lại.');
          this.isSaving = false;
        }
      });
    } else {
      this.showToast(`Đã từ chối mẫu ${sample.id}`);
      this.moveToNext();
    }
  }

  moveToNext(): void {
    if (!this.activeSample) return;

    this.sampleHistory.push(this.activeSample);
    this.activeSample = this.apiQueue.shift() ?? null;
    this.queuePosition = this.activeSample
      ? this.sampleHistory.length + 1
      : this.queueTotal;
    this.resetEditors();
  }

  showNextSample(): void {
    if (this.apiQueue.length > 0) this.moveToNext();
  }

  showPreviousSample(): void {
    if (this.sampleHistory.length === 0) return;

    if (this.activeSample) {
      this.apiQueue.unshift(this.activeSample);
    }

    this.activeSample = this.sampleHistory.pop() ?? null;
    this.queuePosition = Math.max(1, this.queuePosition - 1);
    this.resetEditors();
  }

  selectSample(item: AiSample): void {
    if (!this.activeSample || item.id === this.activeSample.id) return;

    const index = this.apiQueue.findIndex(sample => sample.id === item.id);
    if (index === -1) return;

    this.sampleHistory.push(this.activeSample);
    this.apiQueue.splice(index, 1);
    this.activeSample = item;
    this.queuePosition = this.sampleHistory.length + 1;
    this.resetEditors();
  }

  openLabelEditor(): void {
    if (!this.activeSample) return;
    this.isEditingLabel = true;
    this.editedLabel = this.activeSample.aiPrediction.title;
  }

  saveLabel(): void {
    if (!this.activeSample || !this.editedLabel.trim()) return;
    this.activeSample.aiPrediction.title = this.editedLabel.trim();
    this.isEditingLabel = false;
    this.showToast('Đã cập nhật nhãn trong giao diện.');
  }

  openVenueEditor(): void {
    if (!this.activeSample) return;
    this.isAssigningVenue = true;
    this.editedVenue = this.activeSample.aiPrediction.venueMatch.name;
  }

  assignVenue(): void {
    if (!this.activeSample || !this.editedVenue.trim()) return;
    this.activeSample.aiPrediction.venueMatch.name = this.editedVenue.trim();
    this.isAssigningVenue = false;
    this.showToast('Đã cập nhật tên quán trong giao diện.');
  }

  downloadSampleDataset(): void {
    this.showToast('Chức năng tải bộ dữ liệu mẫu chưa được kết nối API.');
  }

  showToast(msg: string): void {
    this.notice = msg;
    setTimeout(() => {
      if (this.notice === msg) this.notice = '';
    }, 3500);
  }

  private resetEditors(): void {
    this.isEditingLabel = false;
    this.isAssigningVenue = false;
    this.editedLabel = '';
    this.editedVenue = '';
  }
}
