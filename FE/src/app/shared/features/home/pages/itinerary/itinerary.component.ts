import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// --- 1. ĐỊNH NGHĨA MODEL ---

export interface Metric {
  title: string;
  icon: string;
  iconClass: string;
  value: string;
  unit: string;
  subText: string;
  subIcon?: string;
  bgClass: string;
  headerClass: string;
}

export interface MicroTag {
  text: string;
  cssClass: string;
}

export interface TimelineStep {
  type: 'stage' | 'transition';

  // Dành cho 'stage' (Điểm dừng)
  stepNum?: string;
  tag?: string;
  tagClass?: string;
  time?: string;
  title?: string;
  address?: string;
  smartPillIcon?: string;
  smartPillText?: string;
  smartPillSub?: string;
  smartPillClass?: string;
  image?: string;
  imageBadgeIcon?: string;
  imageBadgeText?: string;
  imageBadgeClass?: string;
  priceRange?: string;
  description?: string;
  microTags?: MicroTag[];
  primaryAction?: string;

  // Dành cho 'transition' (Di chuyển)
  transitIcon?: string;
  distanceText?: string;
  routeDesc?: string;
  suggestIcon?: string;
  suggestText?: string;
  suggestClass?: string;
}

export interface AiNotice {
  icon: string;
  iconClass: string;
  title: string;
  titleClass: string;
  desc: string;
  bgClass: string;
  badgeText?: string;
  actionText?: string;
}

export interface ItineraryData {
  metrics: Metric[];
  timeline: TimelineStep[];
  aiNotices: AiNotice[];
}

// --- 2. MOCK API SERVICE ---

export class ItineraryApiService {

  getItinerary(): Observable<ItineraryData> {

    return of<ItineraryData>({

      metrics: [
        {
          title: 'Tổng cự ly',
          icon: 'fa-route',
          iconClass: 'text-primary',
          value: '6.8',
          unit: 'km',
          subText: 'Tiết kiệm 35p (Gom cụm Hải Châu → Sơn Trà)',
          subIcon: 'fa-bolt',
          bgClass: 'bg-surface-container',
          headerClass: 'text-on-surface-variant'
        },
        {
          title: 'Dự trù chi phí',
          icon: 'fa-money-bill-wave',
          iconClass: 'text-tertiary',
          value: '215k - 295k',
          unit: '/ người',
          subText: 'Bao gồm trà đá, tráng miệng & VAT',
          bgClass: 'bg-surface-container',
          headerClass: 'text-on-surface-variant'
        },
        {
          title: 'Nhịp trải nghiệm',
          icon: 'fa-utensils',
          iconClass: 'text-primary-container',
          value: '4 Điểm dừng',
          unit: '',
          subText: 'Sáng • Trưa • Xế chiều • Tối cầu Rồng',
          bgClass: 'bg-surface-container',
          headerClass: 'text-on-surface-variant'
        },
        {
          title: 'Điểm Gu Khẩu Vị',
          icon: 'fa-circle-check',
          iconClass: 'text-secondary',
          value: '96%',
          unit: 'Hợp Minh Tuấn',
          subText: 'Ưu tiên mắm nêm nguyên chất & hải sản tươi',
          bgClass: 'bg-secondary-container/40',
          headerClass: 'text-on-secondary-container font-bold'
        }
      ],

      timeline: [
        {
          type: 'stage',
          stepNum: '01',
          tag: 'BỮA SÁNG ĐẶC SẢN',
          tagClass: 'bg-primary-fixed text-on-primary-fixed',
          time: '07:30 – 08:30',
          title: 'Mì Quảng Bà Tư',
          address: '42 Trưng Nữ Vương, P. Bình Hiên, Q. Hải Châu',
          smartPillIcon: 'fa-clock',
          smartPillText: 'Giờ vàng: 07:30',
          smartPillSub: 'Tránh đông sau 08:15',
          smartPillClass: 'text-secondary',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4ngjPYrf0hYdGAsKzE9NXUPbTur3jmrjXUZ5JLY5FnS-rjqixhyC2QJgAZjSC8fr-GES9Ew4BrH4Gb2_Tlg9Zdk3BcDRazjB7rmAgP7EjVQIeRjAkxJOUSJUNbB5chjxWesDf5pn22-Yar_h24bKBIzNWQptWt6p9-yIN1_GkLMLQuAj-WbTveLtOeEu58NIJCtN4yC6PFD01lJ2P94gHxw5n9GZAM3uQKM0pWn0',
          imageBadgeText: 'Nước lèo nguyên bản',
          imageBadgeClass: 'text-primary',
          priceRange: '35.000đ – 45.000đ',
          description: 'Mì Quảng tôm thịt trứng + rau sống Trà Quế thơm nồng, bánh tráng gạo nướng giòn tan và ớt xiêm xanh ngâm giấm.',
          microTags: [
            {
              text: 'Mở cửa: 06:00 - 13:00',
              cssClass: 'bg-surface-container text-on-surface-variant'
            },
            {
              text: 'Ăn trong 35 phút',
              cssClass: 'bg-surface-container text-on-surface-variant'
            },
            {
              text: 'Khởi hành từ trung tâm',
              cssClass: 'bg-secondary-container/60 text-on-secondary-container font-semibold'
            }
          ],
          primaryAction: 'Xem thực đơn chi tiết'
        },

        {
          type: 'transition',
          transitIcon: 'fa-motorcycle',
          distanceText: 'Di chuyển 1.2 km (~4 phút)',
          routeDesc: 'Trục Trưng Nữ Vương → Bạch Đằng',
          suggestIcon: 'fa-mug-hot',
          suggestText: 'Gợi ý: Ghé Cafe Muối ven sông Bạch Đằng ngắm nắng mai',
          suggestClass: 'text-tertiary'
        },

        {
          type: 'stage',
          stepNum: '02',
          tag: 'BỮA TRƯA ĐẬM ĐÀ',
          tagClass: 'bg-primary-fixed text-on-primary-fixed',
          time: '11:45 – 12:45',
          title: 'Bánh Tráng Cuốn Thịt Heo Bà Mụa',
          address: '93 Nguyễn Chí Thanh, P. Hải Châu 1, Q. Hải Châu',
          smartPillIcon: 'fa-snowflake',
          smartPillText: 'Phòng lạnh 24°C',
          smartPillSub: 'Tránh trưa hè oi ả',
          smartPillClass: 'text-secondary',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeRt3zm0FAQUM-k3v6H-4jydHYLxRdtTbvLHNe_ocIocur45Pn8YrEX9zAWR5LWM1TvycmzACMsvRLCyTlesdmfTQH7Zt4_7aegxiCMixfb3EYirfCwYQaXV8aBO3VubDZvqgj-X9WembVSpxe2npdFOvETD7_5qsRJnOCRkLtn68jpqGgYwJ1mrGNjEvcA9VaIRd6DMB0ykMoMRSgMt_1Iu1nFZCt0lReb0Tu0Zo',
          imageBadgeIcon: 'fa-thumbs-up',
          imageBadgeText: 'Khớp gu 98%',
          imageBadgeClass: 'text-secondary',
          priceRange: '65.000đ – 85.000đ',
          description: 'Thịt heo hai đầu da luộc mọng nước, bánh tráng dẻo Đại Lộc, rau rừng tươi non và chén mắm nêm chưng gia truyền đượm cay.',
          microTags: [
            {
              text: 'Mở xuyên trưa: Đến 21:30',
              cssClass: 'bg-surface-container text-on-surface-variant'
            },
            {
              text: 'Ăn trong 50 phút',
              cssClass: 'bg-surface-container text-on-surface-variant'
            },
            {
              text: 'Đúng gu mắm nêm đã lưu',
              cssClass: 'bg-tertiary-fixed text-on-tertiary-fixed font-semibold'
            }
          ],
          primaryAction: 'Xem menu & Đặt bàn trước'
        },

        {
          type: 'transition',
          transitIcon: 'fa-car',
          distanceText: 'Di chuyển 2.1 km (~6 phút)',
          routeDesc: 'Qua Cầu Rồng sang quận Sơn Trà',
          suggestIcon: 'fa-umbrella-beach',
          suggestText: 'Khoảng nghỉ: Dạo mát rặng dừa Mỹ Khê hoặc check-in Cầu Tình Yêu',
          suggestClass: 'text-secondary'
        },

        {
          type: 'stage',
          stepNum: '03',
          tag: 'ĂN VẶT & GIẢI NHIỆT',
          tagClass: 'bg-primary-fixed text-on-primary-fixed',
          time: '15:30 – 16:30',
          title: 'Chè Sầu Liên & Bánh Ép Nóng',
          address: '189 Hoàng Diệu / 175 Hải Phòng',
          smartPillIcon: 'fa-fire',
          smartPillText: 'Chuẩn nhịp bản địa',
          smartPillSub: 'Khung giờ ăn xế vàng',
          smartPillClass: 'text-tertiary',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAor80OigOeRCn7G8Hjn4vn-DVlAdVTCOUXY2qNyxvuCjKaLSvqfGBV1xOhbewUUhEQ9hNxzSRqpgFtA6xJUu7Vr4wlTh4tNsWS6Z8FclYMP8pAr5027_dumLYEtFFA87D_17rwG7mHmB0qiti2rX1soYmfRv9G5oBcWcl0-3BrQqnu_VknsqsHPYQVWBMDYGbG4T_9y7KWT3DVeHqVbIvx-evBOX1zF44UfR1LJY',
          imageBadgeText: 'Đặc sản giải nhiệt',
          imageBadgeClass: 'text-primary',
          priceRange: '25.000đ – 35.000đ',
          description: 'Chè Thái sầu riêng béo bùi, thạch hoa quả nước cốt dừa tươi; kèm Bánh tráng kẹp bò khô nướng than hoa thơm lừng.',
          microTags: [
            {
              text: 'Mở từ: 09:00 - 22:30',
              cssClass: 'bg-surface-container text-on-surface-variant'
            },
            {
              text: 'Đóng gói mang đi tiện lợi',
              cssClass: 'bg-surface-container text-on-surface-variant'
            }
          ],
          primaryAction: 'Xem danh sách món ngọt'
        },

        {
          type: 'transition',
          transitIcon: 'fa-location-arrow',
          distanceText: 'Di chuyển 2.5 km (~8 phút)',
          routeDesc: 'Đường Võ Nguyên Giáp ven biển hướng về Hoàng Sa',
          suggestIcon: 'fa-camera',
          suggestText: 'Ngắm hoàng hôn bán đảo Sơn Trà rực rỡ lúc 17:45',
          suggestClass: 'text-primary'
        },

        {
          type: 'stage',
          stepNum: '04',
          tag: 'ĐẠI TIỆC HẢI SẢN TỐI',
          tagClass: 'bg-primary-fixed text-on-primary-fixed',
          time: '18:30 – 20:30',
          title: 'Gió Biển Quán - Hải Sản',
          address: 'Lô 14 Hoàng Sa, P. Thọ Quang, Q. Sơn Trà',
          smartPillIcon: 'fa-flag',
          smartPillText: 'Kịp xem Rồng Phun Lửa',
          smartPillSub: 'Lúc 21:00 cuối tuần',
          smartPillClass: 'text-primary',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDa7uAlvurVY870lHbALEppUJ1h-SclhgX8z4Jt636KG4XhT5NFKb5skdKejs_bx_kGXiMr8EZUSY4EvBe9-Sr1kO4mkJomfO302ANAt9dpyhp9W3tm1yDcI7QADt2H97HUuYufcfRS1-Khi3AZwKyd6_LR9RN9OJBWjkJhDfMMxibZ04oOcQXV1c5oOIn9LM-SiXhKu4qYuwrHJf8BrH25zCufqFqbrx_-oyJnuBU',
          imageBadgeText: 'Bắt sống tại hồ cân',
          imageBadgeClass: 'text-primary',
          priceRange: '90.000đ – 130.000đ',
          description: 'Mực một nắng nướng sa tế cay giòn sần sật, chip chip hấp sả thơm ngọt nước dùng, và tôm sú nướng muối ớt xanh.',
          microTags: [
            {
              text: 'Gió biển thoáng mát',
              cssClass: 'bg-surface-container text-on-surface-variant'
            },
            {
              text: 'Tầm nhìn ngắm cầu Thuận Phước',
              cssClass: 'bg-secondary-container/60 text-on-secondary-container font-semibold'
            }
          ],
          primaryAction: 'Đặt chỗ bàn ven biển'
        }
      ],

      aiNotices: [
        {
          icon: 'fa-sun',
          iconClass: 'text-tertiary',
          bgClass: 'bg-surface-container',
          title: 'Thời tiết lý tưởng (29°C)',
          titleClass: 'text-on-surface',
          desc: 'Đà Nẵng nắng đẹp, chiều có gió biển mát. Khi dùng bữa tối ngoài trời tại bán đảo Sơn Trà, nên mang theo áo khoác mỏng.'
        },
        {
          icon: 'fa-code-branch',
          iconClass: 'text-secondary',
          bgClass: 'bg-secondary-container/30',
          title: 'Tối ưu lưu lượng di chuyển',
          titleClass: 'text-on-secondary-container',
          desc: 'Tuyến đường thiết kế xuôi chiều từ Hải Châu qua Cầu Rồng sang Sơn Trà giúp bạn không phải quay đầu xe và tránh tắc đường.'
        },
        {
          icon: 'fa-arrows-rotate',
          iconClass: 'text-primary',
          bgClass: 'bg-primary-fixed/40',
          title: 'Đổi quán thông minh (Dự phòng)',
          titleClass: 'text-on-primary-fixed',
          badgeText: '+0m cự ly',
          actionText: 'Áp dụng quán dự phòng này ngay →',
          desc: 'Nếu Chặng 1 hết chỗ sớm, giải pháp thay thế là Bún Chả Cá Cô Năm cách đó 400m mà không làm thay đổi lộ trình.'
        }
      ]

    }); // Giả lập mạng
  }
}

// --- 3. COMPONENT ---

@Component({
  selector: 'app-itinerary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './itinerary.component.html',
  providers: [ItineraryApiService]
})
export class ItineraryComponent implements OnInit {

  isLoading = true;
  data!: ItineraryData;
  isPlayingAudio = false;

  constructor(private api: ItineraryApiService) {}

  ngOnInit(): void {
    this.api.getItinerary().subscribe(res => {
      this.data = res;
      this.isLoading = false;
    });
  }

  // Giả lập phát audio
  playPhraseAudio(): void {
    if (this.isPlayingAudio) return;

    this.isPlayingAudio = true;

    try {
      const audioCtx = new (
        window.AudioContext ||
        (window as any).webkitAudioContext
      )();

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        880,
        audioCtx.currentTime + 0.3
      );

      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.3
      );

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);

    } catch (e) {
      console.error('Không thể phát audio:', e);
    }

    setTimeout(() => {
      this.isPlayingAudio = false;
    }, 2500);
  }
}
