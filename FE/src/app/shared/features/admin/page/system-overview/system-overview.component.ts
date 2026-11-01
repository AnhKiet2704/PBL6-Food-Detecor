import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AuditorActivity,
  DistrictStat,
  KpiStat,
  TrendLegend, UrgentTask
} from '../../../../models/admin-models/system-overview/system-overview.model';

interface AdminOverviewResponse {
  kpis: Array<{ key: string; title: string; value: number | string; detail: string }>;
  districts: Array<{ name: string; restaurant_count: number; percent: number }>;
  tasks: Array<{
    id: string;
    kind: 'review' | 'price' | 'ai';
    title: string;
    description: string;
    status: string;
  }>;
  task_counts: Record<string, number>;
}

@Component({
  selector: 'app-system-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-overview.component.html',
})
export class SystemOverviewComponent implements OnInit {
  searchQuery: string = '';
  activeTaskFilter: 'review' | 'price' | 'ai' = 'review';
  trendPeriod: '7 ngày' | '30 ngày' | 'Quý này' = '7 ngày';
  readonly trendPaths: Record<
    '7 ngày' | '30 ngày' | 'Quý này',
    { primaryArea: string; primaryLine: string; secondaryArea: string; secondaryLine: string; tertiaryLine: string }
  > = {
    '7 ngày': {
      primaryArea: 'M 0 170 Q 116 140, 233 110 T 466 70 T 700 35 L 700 220 L 0 220 Z',
      primaryLine: 'M 0 170 Q 116 140, 233 110 T 466 70 T 700 35',
      secondaryArea: 'M 0 195 Q 116 175, 233 160 T 466 120 T 700 65 L 700 220 L 0 220 Z',
      secondaryLine: 'M 0 195 Q 116 175, 233 160 T 466 120 T 700 65',
      tertiaryLine: 'M 0 150 Q 116 160, 233 145 T 466 140 T 700 115',
    },
    '30 ngày': {
      primaryArea: 'M 0 190 Q 116 175, 233 145 T 466 95 T 700 50 L 700 220 L 0 220 Z',
      primaryLine: 'M 0 190 Q 116 175, 233 145 T 466 95 T 700 50',
      secondaryArea: 'M 0 205 Q 116 190, 233 175 T 466 145 T 700 100 L 700 220 L 0 220 Z',
      secondaryLine: 'M 0 205 Q 116 190, 233 175 T 466 145 T 700 100',
      tertiaryLine: 'M 0 175 Q 116 165, 233 170 T 466 130 T 700 125',
    },
    'Quý này': {
      primaryArea: 'M 0 205 Q 116 195, 233 160 T 466 105 T 700 30 L 700 220 L 0 220 Z',
      primaryLine: 'M 0 205 Q 116 195, 233 160 T 466 105 T 700 30',
      secondaryArea: 'M 0 210 Q 116 200, 233 185 T 466 150 T 700 80 L 700 220 L 0 220 Z',
      secondaryLine: 'M 0 210 Q 116 200, 233 185 T 466 150 T 700 80',
      tertiaryLine: 'M 0 165 Q 116 180, 233 150 T 466 125 T 700 95',
    },
  };
  notice = '';
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8000/api/admin';
  isLoading = true;
  private taskCounts: Record<string, number> = {};

  ngOnInit(): void {
    this.kpis.forEach((kpi) => {
      kpi.value = '—';
      kpi.subText = 'Đang tải dữ liệu từ máy chủ';
    });
    this.districts = [];
    this.urgentTasks = [];
    void this.loadOverview();
  }

  get filteredTasks(): UrgentTask[] {
    const query = this.searchQuery.trim().toLocaleLowerCase('vi');
    return this.urgentTasks.filter((task) => {
      const matchesQuery =
        !query || `${task.title} ${task.description}`.toLocaleLowerCase('vi').includes(query);
      const matchesFilter =
        this.activeTaskFilter === 'price'
          ? task.kind === 'price'
          : this.activeTaskFilter === 'ai'
            ? task.kind === 'ai'
            : task.kind === 'review';
      return matchesQuery && matchesFilter;
    });
  }

  get reviewTaskCount(): number {
    return this.taskCounts['review'] ?? this.urgentTasks.filter((task) => task.kind === 'review').length;
  }

  get priceTaskCount(): number {
    return this.taskCounts['price'] ?? this.urgentTasks.filter((task) => task.kind === 'price').length;
  }

  get aiTaskCount(): number {
    return this.taskCounts['ai'] ?? this.urgentTasks.filter((task) => task.kind === 'ai').length;
  }

  get allTaskCount(): number {
    return this.taskCounts['all'] ?? this.urgentTasks.length;
  }

  get trendDescription(): string {
    return this.trendPeriod === '7 ngày'
      ? 'Lượng tìm kiếm món ăn đặc sản 7 ngày qua (đơn vị: nghìn lượt)'
      : this.trendPeriod === '30 ngày'
        ? 'Tổng hợp lượng tìm kiếm món ăn đặc sản trong 30 ngày gần nhất'
        : 'Tổng hợp lượng tìm kiếm món ăn đặc sản trong quý hiện tại';
  }

  get trendLabels(): string[] {
    if (this.trendPeriod === '30 ngày') {
      return ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
    }
    if (this.trendPeriod === 'Quý này') {
      return ['Tháng 1', 'Tháng 2', 'Tháng 3'];
    }
    return ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Hôm nay (CN)'];
  }

  selectTrendPeriod(period: '7 ngày' | '30 ngày' | 'Quý này'): void {
    this.trendPeriod = period;
    void this.loadOverview();
  }

  setTaskFilter(filter: 'review' | 'price' | 'ai'): void {
    this.activeTaskFilter = filter;
  }

  openRestaurantManagement(): void {
    void this.router.navigateByUrl('/admin/dashboard');
  }

  inspectTask(task: UrgentTask): void {
    this.notice = `Đang xem chi tiết: ${task.title}`;
  }

  async completeTask(task: UrgentTask): Promise<void> {
    if (!task.apiTaskId) {
      this.notice = 'Tác vụ này không có mã hợp lệ trên máy chủ.';
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/tasks/${encodeURIComponent(task.apiTaskId)}/resolve`, {
          decision: 'approved',
        }),
      );
      this.notice = `Đã xử lý tác vụ "${task.title}".`;
      await this.loadOverview();
    } catch (error: unknown) {
      this.notice = error instanceof Error ? error.message : 'Không thể cập nhật tác vụ.';
    }
  }

  exportReport(): void {
    const rows = [
      ['Chỉ số', 'Giá trị'],
      ...this.kpis.map((kpi) => [kpi.title, kpi.value]),
      [],
      ['Tác vụ cần xử lý', 'Mô tả', 'Trạng thái'],
      ...this.urgentTasks.map((task) => [task.title, task.description, task.badge]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bao-cao-tong-quan.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.notice = 'Đã xuất báo cáo tổng quan CSV.';
  }

  private async loadOverview(): Promise<void> {
    this.isLoading = true;
    this.notice = '';
    const period = this.trendPeriod === '30 ngày'
      ? '30d'
      : this.trendPeriod === 'Quý này'
        ? 'quarter'
        : '7d';
    const params = new HttpParams().set('period', period);
    try {
      const overview = await firstValueFrom(
        this.http.get<AdminOverviewResponse>(`${this.apiUrl}/overview`, { params }),
      );
      const kpiByKey = new Map(overview.kpis.map((kpi) => [kpi.key, kpi]));
      const bindings = [
        ['restaurants', 0],
        ['published_foods', 1],
        ['moderation', 2],
        ['reviews', 3],
      ] as const;
      for (const [key, index] of bindings) {
        const kpi = kpiByKey.get(key);
        if (kpi) {
          this.kpis[index].value = String(kpi.value);
          this.kpis[index].subText = kpi.detail;
          this.kpis[index].trendText = 'Số liệu hiện tại';
          this.kpis[index].progressValue = 0;
        }
      }
      const colors = [
        ['text-primary', 'bg-primary'],
        ['text-secondary', 'bg-secondary'],
        ['text-tertiary', 'bg-tertiary'],
        ['text-on-surface-variant', 'bg-outline-variant'],
      ];
      this.districts = overview.districts.map((district, index) => ({
        name: district.name,
        percent: district.percent,
        count: district.restaurant_count,
        colorClass: colors[index % colors.length][0],
        barClass: colors[index % colors.length][1],
      }));
      this.taskCounts = overview.task_counts;
      this.urgentTasks = overview.tasks.map((task) => this.mapTask(task));
    } catch (error: unknown) {
      this.urgentTasks = [];
      this.taskCounts = {};
      this.notice = error instanceof Error
        ? error.message
        : 'Không thể tải dữ liệu tổng quan từ máy chủ.';
    } finally {
      this.isLoading = false;
    }
  }

  private mapTask(task: AdminOverviewResponse['tasks'][number]): UrgentTask {
    const isAiTask = task.kind === 'ai';
    const isPriceTask = task.kind === 'price';
    return {
      id: task.id,
      apiTaskId: task.id,
      kind: task.kind,
      containerClass: isAiTask ? 'bg-error-container/20' : 'bg-surface-container-lowest hover:shadow-md',
      icon: isAiTask ? 'warning' : isPriceTask ? 'payments' : 'restaurant',
      iconBgClass: isAiTask
        ? 'bg-error-container text-error'
        : isPriceTask
          ? 'bg-tertiary-fixed text-tertiary'
          : 'bg-primary-fixed text-primary',
      title: task.title,
      titleColorClass: isAiTask ? 'text-on-error-container' : 'text-on-surface',
      badge: task.status === 'pending' ? 'Chờ xử lý' : task.status,
      badgeClass: isAiTask
        ? 'bg-error text-on-error'
        : 'bg-tertiary-fixed text-on-tertiary-fixed',
      description: task.description,
      secondaryBtn: {
        label: 'Chi tiết',
        class: 'bg-surface-container-high hover:bg-surface-variant text-on-surface',
      },
      primaryBtn: {
        label: isPriceTask ? 'Duyệt cập nhật giá' : isAiTask ? 'Duyệt mẫu' : 'Phê duyệt',
        class: isAiTask
          ? 'bg-error text-on-error hover:bg-on-error-container'
          : 'bg-primary text-on-primary hover:bg-primary-container',
      },
    };
  }

  // --- 1. DỮ LIỆU KPI ---
  kpis: KpiStat[] = [
    {
      title: 'Tổng số quán ăn', value: '486', icon: 'restaurant',
      iconBgClass: 'bg-primary-fixed', iconColorClass: 'text-primary',
      trendText: '+12 quán mới tuần này', trendIcon: 'trending_up',
      progressValue: 94, progressBgClass: 'bg-secondary',
      subText: '94% đã kiểm định bởi dân bản địa Đà Nẵng'
    },
    {
      title: 'Tìm kiếm & Gợi ý AI', value: '128.4K', icon: 'smart_toy',
      iconBgClass: 'bg-secondary-container', iconColorClass: 'text-secondary',
      trendText: '+18.2% tăng trưởng tháng', trendIcon: 'arrow_upward',
      progressValue: 82, progressBgClass: 'bg-secondary',
      subText: 'Mì Quảng & Bánh xèo chiếm 58% truy vấn'
    },
    {
      title: 'Tra cứu AI Vision', value: '34.2K', icon: 'document_scanner',
      iconBgClass: 'bg-tertiary-fixed', iconColorClass: 'text-tertiary',
      trendText: 'Độ chính xác AI: 97.8%', trendIcon: 'verified',
      progressValue: 97.8, progressBgClass: 'bg-tertiary',
      subText: 'Tỷ lệ nhận diện món qua hình ảnh trực quan',
      subTextIcon: 'verified' // Dùng icon thay vì text thường ở phần trend
    },
    {
      title: 'Đánh giá thực khách', value: '1.842', icon: 'reviews',
      iconBgClass: 'bg-primary-fixed-dim/40', iconColorClass: 'text-primary',
      trendText: '96.5% đánh giá hợp lệ', trendIcon: 'check_circle',
      progressValue: 96.5, progressBgClass: 'bg-primary',
      subText: 'Lọc tự động 64 đánh giá spam & vi phạm'
    }
  ];

  // --- 2. DỮ LIỆU BIỂU ĐỒ & BẢN ĐỒ ---
  trendLegends: TrendLegend[] = [
    { label: 'Mì Quảng', colorClass: 'bg-primary' },
    { label: 'Bánh xèo', colorClass: 'bg-secondary' },
    { label: 'Bún mắm nêm', colorClass: 'bg-tertiary' },
    { label: 'Hải sản tươi sống', colorClass: 'bg-outline' }
  ];

  districts: DistrictStat[] = [
    { name: 'Quận Hải Châu (Trung tâm phố cổ ẩm thực)', percent: 42, count: 204, colorClass: 'text-primary', barClass: 'bg-primary' },
    { name: 'Quận Sơn Trà (Hải sản & ẩm thực đêm)', percent: 28, count: 136, colorClass: 'text-secondary', barClass: 'bg-secondary' },
    { name: 'Quận Ngũ Hành Sơn (Du lịch ven biển)', percent: 18, count: 88, colorClass: 'text-tertiary', barClass: 'bg-tertiary' },
    { name: 'Quận Thanh Khê (Đặc sản bình dân)', percent: 12, count: 58, colorClass: 'text-on-surface-variant', barClass: 'bg-outline-variant' }
  ];

  // --- 3. DỮ LIỆU TÁC VỤ KHẨN CẤP ---
  urgentTasks: UrgentTask[] = [
    {
      id: 1,
      containerClass: 'bg-surface-container-lowest hover:shadow-md',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJvaxWWvNBtC9VQCPV6tz7b7YeH2zV-85Sv0gpV9Uvr3a0bVO1LtFiWXqL2wnYfGUxMU-s7wSf3Ifj8qTEXsZH_k1ZABedkSZIVAQutKBBKG_m51f-JYe2_F4eSWT6AMdwpUZHy-XopTWc80PKs4dLbxnigT5OavpJpl0fF1OPQcNCW6gXPOtR1UkBfdlUbsv9Ew9KUIqRmSEyZvdJgQnM8AbkP_okUnOXOsYhzV0oYXy41502b-uH',
      title: 'Mì Quảng Bà Vị - Chi nhánh 2',
      titleColorClass: 'text-on-surface',
      badge: 'Đã có VSATTP',
      badgeClass: 'bg-secondary-fixed text-on-secondary-fixed',
      description: '166 Lê Đình Dương, P. Phước Ninh, Q. Hải Châu',
      meta1: { icon: 'person', html: 'Thẩm định viên: <strong>Trần Quốc Dũng</strong>' },
      meta2: { icon: 'schedule', html: 'Hẹn kiểm tra: 14:30 Hôm nay', colorClass: 'text-primary font-semibold' },
      secondaryBtn: { label: 'Hồ sơ quán', class: 'bg-surface-container-high hover:bg-surface-variant text-on-surface' },
      primaryBtn: { label: 'Phê duyệt', class: 'bg-primary text-on-primary hover:bg-primary-container' }
    },
    {
      id: 2,
      containerClass: 'bg-surface-container-lowest hover:shadow-md',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5-wXL2npV2VTSNDAoSzFkIwhd_hf1WYhqq8DpF7LZey-6DxlY5AtHuNx3yhr7xV3SXYFzepEHWj_fianhhlJWYzVcl3sDdM17XhSrCp__vbkrQEZa7EKOOXaNVm16lrnlyi6iLX4qJKcEgFycTW0Y2ZKFIehPfc89w56XvBPj_GtNejnkyhNGU-za7GeSjdMoNMHBrSTB807dl6PWXa7OdS4GSLvVBsZWDbzUYTaj7CUmxcDb_Se5',
      title: 'Hải Sản Bé Mặn Sơn Trà',
      titleColorClass: 'text-on-surface',
      badge: 'Đã có VSATTP',
      badgeClass: 'bg-secondary-fixed text-on-secondary-fixed',
      description: 'Lô 11 Võ Nguyên Giáp, Mân Thái, Sơn Trà',
      meta1: { icon: 'person', html: 'Thẩm định viên: <strong>Nguyễn Thị Mai</strong>' },
      meta2: { icon: 'schedule', html: 'Đã kiểm tra thực địa' },
      secondaryBtn: { label: 'Hồ sơ quán', class: 'bg-surface-container-high hover:bg-surface-variant text-on-surface' },
      primaryBtn: { label: 'Phê duyệt', class: 'bg-primary text-on-primary hover:bg-primary-container' }
    },
    {
      id: 3,
      containerClass: 'bg-surface-container-lowest hover:shadow-md',
      icon: 'payments',
      iconBgClass: 'bg-tertiary-fixed text-tertiary',
      title: 'Yêu cầu điều chỉnh menu giá: Bánh tráng cuốn thịt heo Đại Lộc',
      titleColorClass: 'text-on-surface',
      badge: 'Chờ xác thực',
      badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
      description: 'Chủ quán gửi đề xuất tăng suất đặc biệt từ 65.000đ → 75.000đ kèm hóa đơn đối chứng',
      meta1: { html: 'Đệ trình: 2 giờ trước bởi Quản lý quán', colorClass: 'text-on-surface-variant' },
      secondaryBtn: { label: 'Đối soát hóa đơn', class: 'bg-surface-container-high hover:bg-surface-variant text-on-surface' },
      primaryBtn: { label: 'Cập nhật giá', class: 'bg-secondary text-on-secondary hover:bg-on-secondary-container' }
    },
    {
      id: 4,
      containerClass: 'bg-error-container/20',
      icon: 'warning',
      iconBgClass: 'bg-error-container text-error',
      title: 'Cảnh báo AI Vision: Ảnh món ăn mờ / Chưa đạt chuẩn',
      titleColorClass: 'text-on-error-container',
      badge: 'Khẩn cấp',
      badgeClass: 'bg-error text-on-error',
      description: 'Ảnh món Bún Chả Cá Quy Nhơn tại Q. Thanh Khê có độ phân giải thấp và góc chụp bị che khuất',
      meta1: { html: 'Hệ thống AI từ chối lập chỉ mục tự động', colorClass: 'text-error font-semibold' },
      secondaryBtn: { label: 'Yêu cầu ảnh mới', class: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high shadow-sm' },
      primaryBtn: { label: 'Xử lý thủ công', class: 'bg-error text-on-error hover:bg-on-error-container' }
    }
  ];

  // --- 4. DỮ LIỆU KIỂM ĐỊNH VIÊN ---
  auditors: AuditorActivity[] = [
    { id: 1, initials: 'NQ', name: 'Nguyễn Quốc Huy', time: '8 phút trước', avatarBgClass: 'bg-primary-fixed', avatarColorClass: 'text-primary', contentHtml: 'Đã hoàn thành đánh giá thực đơn nước lèo tại <strong>Bún Bò Huế Bà Thương</strong> (Q. Hải Châu). Điểm vị chuẩn: 9.6/10.' },
    { id: 2, initials: 'TH', name: 'Trần Thị Hương', time: '25 phút trước', avatarBgClass: 'bg-secondary-fixed', avatarColorClass: 'text-secondary', contentHtml: 'Tải lên bộ 12 ảnh thực tế khu vực bếp và giấy phép ATTP của <strong>Cơm Gà A Hải</strong>.' },
    { id: 3, initials: 'LM', name: 'Lê Minh Tuấn', time: '1 giờ trước', avatarBgClass: 'bg-tertiary-fixed', avatarColorClass: 'text-tertiary', contentHtml: 'Xác nhận cập nhật biểu phí gửi xe miễn phí cho thực khách tại <strong>Bánh Tráng Cuốn Thịt Heo Mậu</strong>.' }
  ];
}
