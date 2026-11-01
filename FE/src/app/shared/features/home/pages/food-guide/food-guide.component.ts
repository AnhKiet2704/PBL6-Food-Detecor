import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// --- 1. ĐỊNH NGHĨA MODEL ---
export interface Topic {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
}

export interface Sense {
  icon: string;
  name: string;
  desc: string;
}

export interface Highlight {
  step: number;
  title: string;
  desc: string;
}

export interface AudioPhrase {
  id: string;
  tag: string;
  tagClass: string;
  text: string;
  meaning: string;
  duration: string;
  isPlaying: boolean;
}

export interface GuideData {
  topics: Topic[];
  senses: Sense[];
  highlights: Highlight[];
  phrases: AudioPhrase[];
}

// --- 2. MOCK API SERVICE ---
export class GuideApiService {
  getGuideData(): Observable<GuideData> {
    return of({
      topics: [
        { id: 't1', name: 'Tất cả cẩm nang', icon: 'fa-fire', isActive: true },
        { id: 't2', name: 'Văn hóa ăn uống', icon: 'fa-feather', isActive: false },
        { id: 't3', name: 'Mẹo gọi món bản địa', icon: 'fa-bullhorn', isActive: false },
        { id: 't4', name: 'Phân biệt chuẩn vị', icon: 'fa-certificate', isActive: false },
        { id: 't5', name: 'Mùa nào thức nấy', icon: 'fa-calendar-days', isActive: false },
        { id: 't6', name: 'Từ điển Xứ Quảng', icon: 'fa-language', isActive: false },
      ],
      senses: [
        { icon: 'fa-eye', name: 'Thị giác', desc: 'Sắc vàng ươm' },
        { icon: 'fa-ear-listen', name: 'Thính giác', desc: 'Bánh tráng giòn rụm' },
        { icon: 'fa-wind', name: 'Khứu giác', desc: 'Nén phi dầu phụng' },
        { icon: 'fa-utensils', name: 'Vị giác', desc: 'Đậm đà nồng cay' },
        { icon: 'fa-hand', name: 'Xúc giác', desc: 'Độ dai mướt' },
      ],
      highlights: [
        { step: 1, title: 'Quy tắc xăm xắp', desc: 'Nước chan vừa đủ làm ướt sợi mì để giữ vị cô đọng, nếu chan đầy sẽ làm nhạt tính nồng nàn của gia vị.' },
        { step: 2, title: 'Bẻ vụn bánh tráng mè nướng', desc: 'Tiếng vỡ “rôm rốp” tạo kích thích thính giác trước khi ăn, hạt mè bùi hòa với đậu phộng rang giã dập làm bùng nổ kết cấu.' },
        { step: 3, title: 'Cắn trái ớt sừng xanh nguyên cuống', desc: 'Vị cay thanh, giòn rụm của ớt xanh xứ Quảng không làm cháy cuống họng mà đẩy vị ngọt tôm thịt lên đỉnh điểm.' },
      ],
      phrases: [
        { id: 'p1', tag: 'Quán Mì Quảng', tagClass: 'bg-primary-fixed text-primary', text: '“Cho con tô mì nhiều rau sống hoa chuối, thêm ớt xanh cắn giòn chớ đừng chan nước nhiều nghe cô!”', meaning: 'Bát mì Quảng chuẩn không bị lõng bõng nước, kèm rổ rau ghém đúng điệu Trà Quế và trái ớt xanh tươi cay nồng.', duration: '0:04', isPlaying: false },
        { id: 'p2', tag: 'Quán Bánh Tráng', tagClass: 'bg-secondary-fixed text-secondary', text: '“Lấy đĩa thịt hai đầu da nhớ cho chén mắm nêm đậm, cay nhiều giùm con nghe chú!”', meaning: 'Đĩa thịt ba chỉ lạng khéo sao cho hai đầu đều có lớp mỡ giòn; mắm nêm cá cơm đánh cùng thơm băm, tỏi ớt rim.', duration: '0:05', isPlaying: false },
        { id: 'p3', tag: 'Khi Tính Tiền', tagClass: 'bg-tertiary-fixed text-tertiary', text: '“Tính tiền giùm con nghe ơi! Bữa ni ăn ngon hết sẩy luôn nhe cô!”', meaning: 'Lời khen ngọt ngào và tự nhiên nhất dành cho chủ quán miền Trung, đảm bảo bạn sẽ được tặng kèm nụ cười tươi.', duration: '0:03', isPlaying: false },
      ]
    }); // Giả lập mạng 0.6s
  }
}

// --- 3. COMPONENT ---
@Component({
  selector: 'app-food-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './food-guide.component.html',
  providers: [GuideApiService]
})
export class FoodGuideComponent implements OnInit {
  isLoading = true;
  data!: GuideData;

  // State cho Tải PDF
  isDownloading = false;
  showToast = false;
  toastMessage = '';

  constructor(private guideApi: GuideApiService) {}

  ngOnInit(): void {
    this.guideApi.getGuideData().subscribe((res) => {
      this.data = res;
      this.isLoading = false;
    });
  }

  // --- Logic Phát Audio ---
  playAudio(phrase: AudioPhrase): void {
    if (phrase.isPlaying) return;

    phrase.isPlaying = true;

    // Giả lập phát âm thanh bằng Web Audio API để có trải nghiệm thật
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}

    // Reset lại trạng thái sau 2.5s (Giả lập audio dài 2.5s)
    setTimeout(() => {
      phrase.isPlaying = false;
    }, 2500);
  }

  // --- Logic Tải PDF & Hiển thị Toast ---
  triggerDownload(): void {
    if (this.isDownloading) return;
    this.isDownloading = true;

    // Giả lập call API tải file mất 1.5s
    setTimeout(() => {
      this.isDownloading = false;
      this.toastMessage = 'Đã tải thành công "Sổ Tay Bỏ Túi Ẩm Thực Đà Nẵng 2025" (14.2 MB)';
      this.showToast = true;

      // Ẩn Toast sau 4s
      setTimeout(() => {
        this.showToast = false;
      }, 4000);
    }, 1500);
  }
}
