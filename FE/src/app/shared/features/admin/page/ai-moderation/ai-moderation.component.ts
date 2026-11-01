import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AiIngredient,
  PerformanceMetric, QualityPillar,
  UpcomingSample
} from '../../../../models/admin-models/ai-moderation/ai-moderation.model';

interface ModerationSample {
  recordId: number | null;
  id: string;
  timeUpload: string;
  image: string;
  device: string;
  location: string;
  resolution: string;
  gps: string;
  detectionCount: number;
  aiPrediction: {
    matchScore: number;
    title: string;
    desc: string;
    venueMatch: { name: string; score: number; address: string };
    altSuggestion: string;
  };
}

interface ModerationApiSample {
  id: number;
  image_url: string;
  predicted_label: string;
  corrected_label: string | null;
  confidence: number;
  location: string | null;
  device: string | null;
  resolution: string | null;
  gps: string | null;
  venue_name: string | null;
  venue_address: string | null;
  status: string;
}

interface ModerationSamplePage {
  items: ModerationApiSample[];
  total: number;
}

interface AdminOverviewResponse {
  kpis: Array<{ key: string; value: number | string; detail: string }>;
}

@Component({
  selector: 'app-ai-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-moderation.component.html'
})
export class AiModerationComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000/api/admin';
  @Input() searchQuery: string = '';
  confidenceThreshold = 85;
  reviewedCount = 0;
  notice = '';
  isEditingLabel = false;
  isAssigningVenue = false;
  editedLabel = '';
  editedVenue = '';
  queueExhausted = false;
  isLoadingQueue = true;
  totalQueueCount = 0;
  private activeApiSample: ModerationApiSample | null = null;
  apiQueue: ModerationApiSample[] = [];
  sampleHistory: ModerationSample[] = [];

  // --- 1. SỐ LIỆU TỔNG QUAN (METRICS) ---
  metrics: PerformanceMetric[] = [
    {
      title: 'Độ chính xác mô hình', icon: 'verified', iconBg: 'bg-secondary-container/40', iconColor: 'text-secondary',
      value: '98.4%', trendIcon: 'trending_up', trendText: '+0.8%',
      progressValue: 98.4, progressBg: 'bg-secondary',
      subtitle: 'Dữ liệu kiểm thử F1-Score trên 42 món'
    },
    {
      title: 'Ảnh phân tích tuần này', icon: 'photo_camera', iconBg: 'bg-primary-fixed', iconColor: 'text-primary',
      value: '12.840', unit: 'ảnh',
      hasSparkline: true,
      subtitle: 'Tăng 22.4% so với tuần trước'
    },
    {
      title: 'Khớp đặc sản Đà Nẵng', icon: 'ramen_dining', iconBg: 'bg-tertiary-fixed', iconColor: 'text-tertiary',
      value: '96.2%', unit: '/ tổng danh mục',
      progressValue: 96.2, progressBg: 'bg-tertiary-container',
      subtitle: 'Mì Quảng, Bánh tráng thịt heo, Gỏi cá Nam Ô'
    },
    {
      title: 'Cần người thật can thiệp', icon: 'pan_tool', iconBg: 'bg-primary/10', iconColor: 'text-primary',
      value: '14', unit: 'mẫu chờ duyệt',
      isAlert: true,
      subtitle: 'Thời gian phản hồi trung bình: 4.2 phút',
      subtitleIcon: '4 ảnh thiếu góc chụp, 10 ảnh sai tag'
    }
  ];

  // --- 2. CHI TIẾT MẪU ĐANG DUYỆT (ACTIVE SAMPLE) ---
  activeSample: ModerationSample = {
    recordId: null,
    id: '—',
    timeUpload: '—',
    image: '',
    device: '—',
    location: '—',
    resolution: '—',
    gps: '—',
    detectionCount: 0,
    aiPrediction: {
      matchScore: 0,
      title: 'Chưa có mẫu',
      desc: 'Hàng đợi chưa có dữ liệu kiểm duyệt.',
      venueMatch: { name: 'Chưa gán quán', score: 0, address: '—' },
      altSuggestion: '—'
    }
  };

  ingredients: AiIngredient[] = [
    { name: 'Sợi mì vàng nghệ', percent: 98 },
    { name: 'Đậu phụng rang', percent: 96 },
    { name: 'Bánh tráng mè nướng', percent: 93 },
    { name: 'Rau cải con & bắp chuối', percent: 91 },
    { name: 'Thố ếch om sả ớt', percent: 89 }
  ];

  // --- 3. HÀNG ĐỢI TIẾP THEO (UPCOMING) ---
  upcomingSamples: UpcomingSample[] = [
    { title: 'Bánh Xèo Tôm Nhảy', subtitle: 'Bánh Xèo Bà Dưỡng', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjSAWMbpUEu8XihUt1P_vohUgD5Ta9tej3UebXkyIW9TWSJe4_Sb753CEpm8n3h1h9I5wA94Uq2TwTqWrti8EA8qFyBpLg4IDReQVgUI3dLqi8QPANyDipOHdNkkuqduQB3Gx_BdpWr9KOQp5-5I5tEvInzrFId62P3BIia8hd9sPIfBNSSVXBVRv5A8BLW50oF4F7hlEMmt9y6FFFq5QKKC2QsjovpD8mamWAGWzArJ3V4NGJoMxJ', score: 98.1, scoreBg: 'bg-secondary text-on-secondary', status: 'Sẵn sàng', statusClass: 'text-secondary-container bg-secondary' },
    { title: 'Gỏi Cá Nam Ô (Ướt)', subtitle: 'Gỏi Cá Thanh Hương', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5KYT4hegcV6QWI3ZnD69BcbsawWayy0VfD-l-KoG_3vjs5Z0gwoPpaUawMZ0NUXqPDKnxv1SelwTaO5HnZZILFAihF3foZqRClECGPuVaC9ZnsQEuf8HlIrS961gsLew8qK1pEokhTsXY6cf9qa1BdnQEwaF8ikuqS1KVnRfz1kOPDH_dOsh6ZG2vQOIwkVN_oKnVZOB58BDIY9vOHmTLF6qVTc8PXYkd7wkpAHmNoRgXzvIgHvgz', score: 87.5, scoreBg: 'bg-tertiary-container text-on-tertiary-container', status: 'Cần xem', statusClass: 'bg-tertiary-fixed text-on-tertiary-fixed' },
    { title: 'Bánh Tráng Cuốn Thịt Heo', subtitle: 'Quán Mậu - Đỗ Thúc Tịnh', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxZtBRxoA6ayXoVsHIMcYxc2yfY_O0tZ0gQDIEmScxVjm-BgGmDcP0kfvLKh73CHcluq3ULIrO9QzkCVoRLz4QXixzHLorwOADzfUFtBv37_s8TzX6lE6YDCemsRM7rQMArQInl6f1muaNW4NPUDiBcicHexGEEnSShR4XdVhFsb2Mlmze_LKj84-HrNcfim93BPdwgsVv_JNiJ0U0y_uUHte6g1xmSsENQPyDvbet0mr2gSyAZb1c', score: 95.9, scoreBg: 'bg-secondary text-on-secondary', status: 'Sẵn sàng', statusClass: 'text-secondary-container bg-secondary' }
  ];

  // --- 4. TIÊU CHUẨN KIỂM ĐỊNH (PILLARS) ---
  pillars: QualityPillar[] = [
    { id: 1, title: 'Vị Nước Dùng Bản Sắc', weight: '35%', description: 'Nước nhưn (nước lèo) mì Quảng phải sắc nét, sánh vừa, đậm vị tôm thịt hoặc cá tràu, ngọt từ xương tự nhiên, không lạm dụng bột ngọt hóa chất.', tags: ['Thử mẫu mù (Blind-test)', 'Độ mặn/ngọt chuẩn'], iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { id: 2, title: 'Nguyên Liệu Miền Trung', weight: '25%', description: 'Rau sống phải có cải con cay nồng, bắp chuối sứ, húng lủi Trà Quế; mắm nêm cá cơm ủ thủ công từ làng chài truyền thống Nam Ô hoặc Cửa Đại.', tags: ['Có nguồn gốc rau', 'Mắm nêm ủ > 6 tháng'], iconBg: 'bg-tertiary/10', iconColor: 'text-tertiary' },
    { id: 3, title: 'Vệ Sinh & An Toàn (VSATTP)', weight: '20%', description: 'Khu vực chế biến ngăn nắp, tủ kính đậy kín món nấu, đũa muỗng tiệt trùng, nguồn nước sạch đạt chuẩn kiểm nghiệm y tế TP Đà Nẵng định kỳ.', tags: ['Giấy phép VSATTP', 'Găng tay chế biến'], iconBg: 'bg-secondary/10', iconColor: 'text-secondary' },
    { id: 4, title: 'Giá Niêm Yết Minh Bạch', weight: '20%', description: 'Tuyệt đối không có hành vi "chặt chém" du khách. Menu in rõ ràng, đồng giá cho khách địa phương và du khách quốc tế, quét mã thanh toán minh bạch.', tags: ['Bảng giá cố định', 'Hỗ trợ QR / VietQR'], iconBg: 'bg-primary-container/20', iconColor: 'text-primary-container' }
  ];

  constructor() {
    this.editedLabel = this.activeSample.aiPrediction.title;
    this.editedVenue = this.activeSample.aiPrediction.venueMatch.name;
  }

  ngOnInit(): void {
    void this.loadQueue();
    void this.loadMetrics();
  }

  get visibleUpcomingSamples(): UpcomingSample[] {
    return this.apiQueue
      .filter((sample) => sample.confidence >= this.confidenceThreshold)
      .map((sample) => ({
        id: sample.id,
        title: sample.corrected_label || sample.predicted_label,
        subtitle: sample.venue_name || sample.location || 'Chưa gán quán',
        image: sample.image_url,
        score: sample.confidence,
        scoreBg: sample.confidence >= 90 ? 'bg-secondary text-on-secondary' : 'bg-tertiary-container text-on-tertiary-container',
        status: 'Chờ duyệt',
        statusClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
      }));
  }

  get queuePosition(): number {
    return this.reviewedCount + this.sampleHistory.length + (this.activeApiSample ? 1 : 0);
  }

  get queueTotal(): number {
    return this.reviewedCount + this.totalQueueCount;
  }

  showPreviousSample(): void {
    if (this.sampleHistory.length === 0) return;
    if (this.activeApiSample) this.apiQueue.unshift(this.activeApiSample);
    this.activeSample = this.sampleHistory.pop()!;
    this.activeApiSample = this.apiQueue.find((sample) => sample.id === this.activeSample.recordId) ?? null;
    if (this.activeApiSample) {
      this.apiQueue = this.apiQueue.filter((sample) => sample.id !== this.activeApiSample?.id);
    }
    this.queueExhausted = false;
    this.notice = '';
  }

  showNextSample(): void {
    const next = this.apiQueue[0];
    if (!next) return;
    this.selectSample(this.toQueueItem(this.fromApiSample(next)));
  }

  selectSample(sample: UpcomingSample): void {
    if (sample.id === undefined) return;
    const next = this.apiQueue.find((item) => item.id === sample.id);
    if (!next) return;
    if (this.activeApiSample) this.apiQueue.push(this.activeApiSample);
    this.apiQueue = this.apiQueue.filter((item) => item.id !== next.id);
    this.sampleHistory.push(this.activeSample);
    this.activeApiSample = next;
    this.activeSample = this.fromApiSample(next);
    this.queueExhausted = false;
    this.editedLabel = this.activeSample.aiPrediction.title;
    this.editedVenue = this.activeSample.aiPrediction.venueMatch.name;
    this.notice = '';
  }

  async decideSample(decision: 'approved' | 'rejected'): Promise<void> {
    if (!this.activeApiSample) {
      this.notice = 'Không có mẫu đã lưu trên máy chủ để cập nhật.';
      return;
    }
    const name = this.activeSample.aiPrediction.title;
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/moderation/samples/${this.activeApiSample.id}`,
          {
            decision,
            corrected_label: this.activeSample.aiPrediction.title,
            venue_name: this.activeSample.aiPrediction.venueMatch.name,
          },
        ),
      );
    } catch (error: unknown) {
      this.notice = error instanceof Error ? error.message : 'Không thể lưu quyết định kiểm duyệt.';
      return;
    }
    this.reviewedCount++;
    this.totalQueueCount = Math.max(0, this.totalQueueCount - 1);
    const decisionMessage = decision === 'approved'
      ? `Đã xác nhận nhãn "${name}" và đưa mẫu vào tập dữ liệu đã kiểm duyệt.`
      : `Đã từ chối mẫu "${name}" khỏi tập dữ liệu huấn luyện.`;
    this.sampleHistory = [];
    const next = this.visibleUpcomingSamples[0];
    this.activeApiSample = null;
    if (next) {
      const sample = this.apiQueue.find((item) => item.id === next.id);
      this.apiQueue = this.apiQueue.filter((item) => item.id !== sample?.id);
      if (sample) {
        this.activeApiSample = sample;
        this.activeSample = this.fromApiSample(sample);
        this.editedLabel = this.activeSample.aiPrediction.title;
        this.editedVenue = this.activeSample.aiPrediction.venueMatch.name;
      }
    }
    this.queueExhausted = !this.activeApiSample;
    this.notice = this.activeApiSample
      ? `${decisionMessage} Đang chuyển sang mẫu tiếp theo.`
      : `${decisionMessage} Hàng đợi đã hết mẫu.`;
    void this.loadMetrics();
  }

  openLabelEditor(): void {
    this.editedLabel = this.activeSample.aiPrediction.title;
    this.isEditingLabel = true;
  }

  saveLabel(): void {
    const label = this.editedLabel.trim();
    if (!label) {
      this.notice = 'Tên nhãn không được để trống.';
      return;
    }
    void this.saveSampleChanges({ corrected_label: label }, () => {
      this.activeSample.aiPrediction.title = label;
      this.isEditingLabel = false;
      this.notice = `Đã cập nhật nhãn thành "${label}".`;
    });
  }

  openVenueEditor(): void {
    this.editedVenue = this.activeSample.aiPrediction.venueMatch.name;
    this.isAssigningVenue = true;
  }

  assignVenue(): void {
    const venue = this.editedVenue.trim();
    if (!venue) {
      this.notice = 'Tên quán không được để trống.';
      return;
    }
    void this.saveSampleChanges({ venue_name: venue }, () => {
      this.activeSample.aiPrediction.venueMatch.name = venue;
      this.isAssigningVenue = false;
      this.notice = `Đã gán mẫu cho ${venue}.`;
    });
  }

  downloadSampleDataset(): void {
    const samples = [
      ...this.sampleHistory.map((sample) => ({
        id: sample.id,
        label: sample.aiPrediction.title,
        confidence: sample.aiPrediction.matchScore,
        location: sample.location,
        image: sample.image,
      })),
      {
        id: this.activeSample.id,
        label: this.activeSample.aiPrediction.title,
        confidence: this.activeSample.aiPrediction.matchScore,
        location: this.activeSample.location,
        image: this.activeSample.image,
      },
      ...this.apiQueue.map((sample) => ({
        id: sample.id,
        label: sample.corrected_label || sample.predicted_label,
        confidence: sample.confidence,
        location: sample.location,
        image: sample.image_url,
      })),
    ];
    const blob = new Blob([JSON.stringify(samples, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'food-moderation-samples.json';
    link.click();
    URL.revokeObjectURL(url);
    this.notice = `Đã tải ${samples.length} mẫu dữ liệu JSON.`;
  }

  private toQueueItem(sample: ModerationSample): UpcomingSample {
    return {
      id: sample.recordId ?? undefined,
      title: sample.aiPrediction.title,
      subtitle: sample.aiPrediction.venueMatch.name,
      image: sample.image,
      score: sample.aiPrediction.matchScore,
      scoreBg: 'bg-secondary text-on-secondary',
      status: 'Trong hàng đợi',
      statusClass: 'bg-secondary-container text-on-secondary-container',
    };
  }

  private fromQueueItem(sample: UpcomingSample): ModerationSample {
    return {
      recordId: sample.id ?? null,
      id: `#IMG-${String(85000 + this.reviewedCount + this.sampleHistory.length).padStart(5, '0')}`,
      timeUpload: 'Vừa nhận',
      image: sample.image,
      device: 'Thiết bị chưa xác định',
      location: 'Đà Nẵng',
      resolution: 'Đang cập nhật',
      gps: 'Chưa có dữ liệu GPS',
      detectionCount: 1,
      aiPrediction: {
        matchScore: sample.score,
        title: sample.title,
        desc: 'Mẫu ảnh món ăn đang chờ chuyên gia kiểm duyệt.',
        venueMatch: { name: sample.subtitle, score: sample.score, address: 'Đang cập nhật địa chỉ' },
        altSuggestion: 'Chưa có gợi ý thay thế',
      },
    };
  }

  private async loadQueue(): Promise<void> {
    this.isLoadingQueue = true;
    const params = new HttpParams().set('status', 'pending').set('page', 1).set('page_size', 50);
    try {
      const page = await firstValueFrom(
        this.http.get<ModerationSamplePage>(`${this.apiUrl}/moderation/samples`, { params }),
      );
      this.totalQueueCount = page.total;
      this.apiQueue = page.items;
      const firstSample = this.apiQueue.shift();
      if (firstSample) {
        this.activeApiSample = firstSample;
        this.activeSample = this.fromApiSample(firstSample);
        this.editedLabel = this.activeSample.aiPrediction.title;
        this.editedVenue = this.activeSample.aiPrediction.venueMatch.name;
        this.queueExhausted = false;
      } else {
        this.activeApiSample = null;
        this.queueExhausted = true;
        this.notice = 'Hàng đợi kiểm duyệt hiện chưa có mẫu.';
      }
    } catch (error: unknown) {
      this.queueExhausted = true;
      this.totalQueueCount = 0;
      this.notice = error instanceof Error
        ? error.message
        : 'Không thể tải hàng đợi kiểm duyệt từ máy chủ.';
    } finally {
      this.isLoadingQueue = false;
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const overview = await firstValueFrom(
        this.http.get<AdminOverviewResponse>(`${this.apiUrl}/overview`),
      );
      const moderation = overview.kpis.find((item) => item.key === 'moderation');
      if (moderation) {
        const metric = this.metrics.find((item) => item.isAlert);
        if (metric) metric.value = String(moderation.value);
      }
    } catch (error: unknown) {
      this.notice = error instanceof Error
        ? error.message
        : 'Không thể tải số liệu kiểm duyệt từ máy chủ.';
    }
  }

  private fromApiSample(sample: ModerationApiSample): ModerationSample {
    return {
      recordId: sample.id,
      id: `#IMG-${sample.id}`,
      timeUpload: 'Trong hàng đợi',
      image: sample.image_url,
      device: sample.device ?? 'Thiết bị chưa xác định',
      location: sample.location ?? 'Chưa có vị trí',
      resolution: sample.resolution ?? 'Chưa có thông tin',
      gps: sample.gps ?? 'Chưa có dữ liệu GPS',
      detectionCount: 1,
      aiPrediction: {
        matchScore: sample.confidence,
        title: sample.corrected_label || sample.predicted_label,
        desc: 'Mẫu ảnh đang chờ chuyên gia kiểm duyệt.',
        venueMatch: {
          name: sample.venue_name ?? 'Chưa gán quán',
          score: sample.confidence,
          address: sample.venue_address ?? 'Chưa có địa chỉ',
        },
        altSuggestion: 'Chưa có gợi ý thay thế',
      },
    };
  }

  private async saveSampleChanges(
    payload: { corrected_label?: string; venue_name?: string },
    onSuccess: () => void,
  ): Promise<void> {
    if (!this.activeApiSample) {
      this.notice = 'Mẫu hiện tại chưa được lưu trên máy chủ.';
      return;
    }
    try {
      const updated = await firstValueFrom(
        this.http.patch<ModerationApiSample>(`${this.apiUrl}/moderation/samples/${this.activeApiSample.id}`, {
          decision: 'pending',
          ...payload,
        }),
      );
      this.activeApiSample = updated;
      this.activeSample = this.fromApiSample(updated);
      this.editedLabel = updated.corrected_label || updated.predicted_label;
      this.editedVenue = updated.venue_name ?? '';
      onSuccess();
    } catch (error: unknown) {
      this.notice = error instanceof Error ? error.message : 'Không thể lưu thông tin mẫu.';
    }
  }
}
