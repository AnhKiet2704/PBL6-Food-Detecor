export interface PerformanceMetric {
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  value: string;
  unit?: string;
  trendIcon?: string;
  trendText?: string;
  progressValue?: number;
  progressBg?: string;
  subtitle: string;
  subtitleIcon?: string;
  isAlert?: boolean;
  hasSparkline?: boolean;
}

export interface AiIngredient {
  name: string;
  percent: number;
}

export interface UpcomingSample {
  id?: number;
  title: string;
  subtitle: string;
  image: string;
  score: number;
  scoreBg: string;
  status: string;
  statusClass: string;
}

export interface QualityPillar {
  id: number;
  title: string;
  weight: string;
  description: string;
  tags: string[];
  iconBg: string;
  iconColor: string;
}
