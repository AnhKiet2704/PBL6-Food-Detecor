export interface KpiStat {
  title: string;
  value: string;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  trendText: string;
  trendIcon: string;
  progressValue: number;
  progressBgClass: string;
  subText: string;
  subTextIcon?: string;
}

export interface TrendLegend {
  label: string;
  colorClass: string;
}

export interface DistrictStat {
  name: string;
  percent: number;
  count: number;
  colorClass: string;
  barClass: string;
}

export interface UrgentTask {
  id: number | string;
  apiTaskId?: string;
  kind?: 'review' | 'price' | 'ai';
  containerClass: string;
  image?: string;
  icon?: string;
  iconBgClass?: string;
  title: string;
  titleColorClass: string;
  badge: string;
  badgeClass: string;
  description: string;
  meta1?: { icon?: string; html: string; colorClass?: string };
  meta2?: { icon?: string; html: string; colorClass?: string };
  secondaryBtn: { label: string; class: string };
  primaryBtn: { label: string; class: string };
}

export interface AuditorActivity {
  id: number;
  name: string;
  initials: string;
  avatarBgClass: string;
  avatarColorClass: string;
  time: string;
  contentHtml: string;
}
