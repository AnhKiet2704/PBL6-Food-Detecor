export interface StatHighlight {
  label: string;
  value: string;
  subValue?: string;
  trendText: string;
  trendIcon: string;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  iconFill?: boolean;
}

export interface SpecialtyTag {
  label: string;
  isActive: boolean;
}

export interface AuditHistory {
  date: string;
  title: string;
  description: string;
}

export interface Restaurant {
  id: number;
  name: string;
  address: string;
  image: string;
  rating: number;
  reviewCount: number;
  reviewLabel: string;
  category: string;
  priceRange: string;
  secret: string;
  matchScore: number;
  matchLabel: string;
  status: 'verified' | 'pending' | 'rejected' | 'closed';

  heritage: string;
  openHours: string;
  gps: string;
  mapImage: string;
  ownerName: string;
  ownerPhone: string;
  ownerInitial: string;
  tasteScore: number;
  audits: AuditHistory[];
}
