import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';
import type {
  DistrictStat,
  KpiStat,
  TrendLegend,
  UrgentTask,
} from '../../../../models/admin-models/system-overview/system-overview.model';

type TrendPeriod = '7 ngày' | '30 ngày' | 'Quý này';
type TaskKind = 'review' | 'price' | 'ai';

interface TrendPoint {
  label: string;
  restaurants: number;
  reviews: number;
  moderation_samples: number;
}

interface AdminOverviewResponse {
  kpis: Array<{
    key: string;
    title: string;
    value: number | string;
    detail: string;
    progress: number;
  }>;
  districts: Array<{ name: string; restaurant_count: number; percent: number }>;
  tasks: Array<{
    id: string;
    kind: TaskKind;
    title: string;
    description: string;
    status: string;
    created_at: string | null;
    restaurant_id: number | null;
    sample_id: number | null;
    price_change_id: number | null;
  }>;
  task_counts: Record<string, number>;
  period: string;
  trends: TrendPoint[];
}

interface TrendPaths {
  primaryArea: string;
  primaryLine: string;
  secondaryArea: string;
  secondaryLine: string;
  tertiaryLine: string;
}

const KPI_PRESENTATION: Record<string, Pick<KpiStat, 'icon' | 'iconBgClass' | 'iconColorClass' | 'progressBgClass'>> = {
  restaurants: {
    icon: 'fa-solid fa-utensils',
    iconBgClass: 'bg-primary-fixed',
    iconColorClass: 'text-primary',
    progressBgClass: 'bg-primary',
  },
  published_foods: {
    icon: 'fa-solid fa-bowl-food',
    iconBgClass: 'bg-secondary-container',
    iconColorClass: 'text-secondary',
    progressBgClass: 'bg-secondary',
  },
  moderation: {
    icon: 'fa-solid fa-images',
    iconBgClass: 'bg-tertiary-fixed',
    iconColorClass: 'text-tertiary',
    progressBgClass: 'bg-tertiary',
  },
  reviews: {
    icon: 'fa-solid fa-comments',
    iconBgClass: 'bg-primary-fixed-dim/40',
    iconColorClass: 'text-primary',
    progressBgClass: 'bg-primary',
  },
};

const DISTRICT_COLORS = [
  ['text-primary', 'bg-primary'],
  ['text-secondary', 'bg-secondary'],
  ['text-tertiary', 'bg-tertiary'],
  ['text-on-surface-variant', 'bg-outline-variant'],
];

@Component({
  selector: 'app-system-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-overview.component.html',
})
export class SystemOverviewComponent implements OnInit {
  searchQuery = '';
  activeTaskFilter: TaskKind = 'review';
  trendPeriod: TrendPeriod = '7 ngày';
  notice = '';
  loadError = '';
  isLoading = true;
  isApiConnected = false;
  resolvingTaskId: string | null = null;

  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = 'http://localhost:8000/api/admin';
  private overviewRequestId = 0;
  private taskCounts: Record<string, number> = {};

  kpis: KpiStat[] = [];
  urgentTasks: UrgentTask[] = [];
  districts: DistrictStat[] = [];
  trendLabels: string[] = [];
  trendPaths: Record<TrendPeriod, TrendPaths> = {
    '7 ngày': this.emptyTrendPaths(),
    '30 ngày': this.emptyTrendPaths(),
    'Quý này': this.emptyTrendPaths(),
  };

  readonly trendLegends: TrendLegend[] = [
    { label: 'Quán ăn mới', colorClass: 'bg-primary' },
    { label: 'Đánh giá mới', colorClass: 'bg-secondary' },
    { label: 'Ảnh AI mới', colorClass: 'bg-tertiary' },
  ];

  get adminName(): string {
    const user = this.authService.getCurrentUserSnapshot();
    return user?.full_name?.trim() || user?.email || 'Quản trị viên';
  }

  ngOnInit(): void {
    void this.loadOverview();
  }

  get filteredTasks(): UrgentTask[] {
    const query = this.normalize(this.searchQuery.trim());
    return this.urgentTasks.filter((task) => {
      const matchesQuery =
        !query || this.normalize(`${task.title} ${task.description}`).includes(query);
      return matchesQuery && task.kind === this.activeTaskFilter;
    });
  }

  get reviewTaskCount(): number {
    return this.taskCounts['review'] ?? 0;
  }

  get priceTaskCount(): number {
    return this.taskCounts['price'] ?? 0;
  }

  get aiTaskCount(): number {
    return this.taskCounts['ai'] ?? 0;
  }

  get allTaskCount(): number {
    return this.taskCounts['all'] ?? 0;
  }

  get trendDescription(): string {
    const description = this.trendPeriod === '7 ngày'
      ? 'Số bản ghi mới theo ngày trong 7 ngày gần nhất.'
      : this.trendPeriod === '30 ngày'
        ? 'Số bản ghi mới theo từng khoảng 5 ngày trong 30 ngày gần nhất.'
        : 'Số bản ghi mới theo tháng trong quý hiện tại.';
    return `${description} Lượt tìm kiếm và dự đoán AI chưa được lưu thành lịch sử.`;
  }

  get currentAdminGreeting(): string {
    return `Chào mừng trở lại, ${this.adminName}`;
  }

  get busiestDistrict(): string {
    return this.districts[0]?.name ?? '';
  }

  selectTrendPeriod(period: TrendPeriod): void {
    if (this.trendPeriod === period) return;
    this.trendPeriod = period;
    void this.loadOverview();
  }

  refreshOverview(): void {
    void this.loadOverview();
  }

  setTaskFilter(filter: TaskKind): void {
    this.activeTaskFilter = filter;
  }

  openRestaurantManagement(): void {
    void this.router.navigateByUrl('/admin/dashboard');
  }

  inspectTask(task: UrgentTask): void {
    if (task.kind === 'ai') {
      void this.router.navigateByUrl('/admin/ai-moderation');
      return;
    }
    if (task.kind === 'review') {
      const restaurantName = task.title.replace(/^Thẩm định hồ sơ:\s*/i, '');
      void this.router.navigate(['/admin/dashboard'], { queryParams: { q: restaurantName } });
      return;
    }
    this.notice = task.description;
  }

  async completeTask(task: UrgentTask): Promise<void> {
    if (!task.apiTaskId || this.resolvingTaskId) return;
    this.resolvingTaskId = task.apiTaskId;
    this.notice = '';
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/tasks/${encodeURIComponent(task.apiTaskId)}/resolve`, {
          decision: 'approved',
        }),
      );
      await this.loadOverview();
      this.notice = `Đã xử lý tác vụ "${task.title}".`;
    } catch (error: unknown) {
      this.notice = this.apiErrorMessage(error, 'Không thể cập nhật tác vụ.');
    } finally {
      this.resolvingTaskId = null;
    }
  }

  exportReport(): void {
    const rows = [
      ['Chỉ số', 'Giá trị', 'Chi tiết'],
      ...this.kpis.map((kpi) => [kpi.title, kpi.value, kpi.subText]),
      [],
      ['Khu vực', 'Số quán', 'Tỷ lệ'],
      ...this.districts.map((district) => [district.name, district.count, `${district.percent}%`]),
      [],
      ['Tác vụ cần xử lý', 'Mô tả', 'Trạng thái'],
      ...this.urgentTasks.map((task) => [task.title, task.description, task.badge]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bao-cao-tong-quan.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.notice = 'Đã xuất báo cáo tổng quan CSV.';
  }

  private async loadOverview(): Promise<void> {
    const requestId = ++this.overviewRequestId;
    this.isLoading = true;
    this.loadError = '';
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
      if (requestId !== this.overviewRequestId) return;

      this.isApiConnected = true;
      this.kpis = overview.kpis.flatMap((kpi) => {
        const presentation = KPI_PRESENTATION[kpi.key];
        return presentation
          ? [{
            title: kpi.title,
            value: Number(kpi.value).toLocaleString('vi-VN'),
            ...presentation,
            trendText: `${kpi.progress.toLocaleString('vi-VN')}%`,
            trendIcon: 'fa-solid fa-chart-simple',
            progressValue: kpi.progress,
            subText: kpi.detail,
          }]
          : [];
      });
      this.districts = overview.districts.map((district, index) => {
        const [colorClass, barClass] = DISTRICT_COLORS[index % DISTRICT_COLORS.length];
        return {
          name: district.name,
          percent: district.percent,
          count: district.restaurant_count,
          colorClass,
          barClass,
        };
      });
      this.taskCounts = overview.task_counts;
      this.urgentTasks = overview.tasks.map((task) => this.mapTask(task));
      this.trendLabels = overview.trends.map((point) => point.label);
      this.trendPaths[this.trendPeriod] = this.createTrendPaths(overview.trends);
    } catch (error: unknown) {
      if (requestId !== this.overviewRequestId) return;
      this.isApiConnected = false;
      this.kpis = [];
      this.districts = [];
      this.urgentTasks = [];
      this.taskCounts = {};
      this.trendLabels = [];
      this.loadError = this.apiErrorMessage(error, 'Không thể tải dữ liệu tổng quan.');
    } finally {
      if (requestId === this.overviewRequestId) this.isLoading = false;
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
      icon: isAiTask
        ? 'fa-solid fa-triangle-exclamation'
        : isPriceTask
          ? 'fa-solid fa-money-bill-wave'
          : 'fa-solid fa-store',
      iconBgClass: isAiTask
        ? 'bg-error-container text-error'
        : isPriceTask
          ? 'bg-tertiary-fixed text-tertiary'
          : 'bg-primary-fixed text-primary',
      title: task.title,
      titleColorClass: isAiTask ? 'text-on-error-container' : 'text-on-surface',
      badge: task.status === 'pending' ? 'Chờ xử lý' : task.status,
      badgeClass: isAiTask ? 'bg-error text-on-error' : 'bg-tertiary-fixed text-on-tertiary-fixed',
      description: task.description,
      secondaryBtn: {
        label: isPriceTask ? 'Xem đề xuất' : task.kind === 'ai' ? 'Mở kiểm duyệt' : 'Xem hồ sơ',
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

  private createTrendPaths(points: TrendPoint[]): TrendPaths {
    return {
      primaryArea: this.areaPath(points.map((point) => point.restaurants)),
      primaryLine: this.linePath(points.map((point) => point.restaurants)),
      secondaryArea: this.areaPath(points.map((point) => point.reviews)),
      secondaryLine: this.linePath(points.map((point) => point.reviews)),
      tertiaryLine: this.linePath(points.map((point) => point.moderation_samples)),
    };
  }

  private linePath(values: number[]): string {
    if (!values.length) return '';
    const max = Math.max(1, ...values);
    return values.map((value, index) => {
      const x = values.length === 1 ? 350 : (index / (values.length - 1)) * 700;
      const y = 210 - (value / max) * 175;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  private areaPath(values: number[]): string {
    const line = this.linePath(values);
    return line ? `${line} L 700 220 L 0 220 Z` : '';
  }

  private emptyTrendPaths(): TrendPaths {
    return { primaryArea: '', primaryLine: '', secondaryArea: '', secondaryLine: '', tertiaryLine: '' };
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi');
  }

  private apiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string') return detail;
    }
    return fallback;
  }
}
