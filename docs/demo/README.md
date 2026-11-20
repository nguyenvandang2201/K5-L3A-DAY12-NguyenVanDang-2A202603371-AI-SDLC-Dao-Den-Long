# Video demo

[Xem demo.mp4](demo.mp4). Bản này là video quay trình duyệt thật ở1280×720, mã hóa H.264, dưới5phút. Mã quay: scripts/demo.mjs; công cụ Playwright/FFmpeg. Video không thu track âm thanh; game thật có nhạc và hiệu ứng Web Audio sau thao tác bắt đầu.

Nội dung: menu/giới thiệu, chơi bằng phím thực (không dựng scenario), nhặt/nạp và điều khiển, cài đặt; trích nguyên văn test output và headless JSONL; cảnh benchmark chuẩn chạy3s khởi động+30s đo; report benchmark và soak.

Phần headless trong video là scenario kiểm thử có đèn dựng sẵn và thời gian ngắn, được ghi rõ trên màn hình; không trình bày đó là lượt thắng tự nhiên của đoạn chơi vừa quay. Các ảnh night2/3 trong proof cũng được chụp bằng QA scenario có nhãn.

Tái quay (công cụ phát triển, không cần để chơi):

```bash
npx playwright install chromium ffmpeg
node scripts/demo.mjs --ffmpeg /path/to/ffmpeg
```

Chạy npm run build, verification, prove và soak trước để video đọc đúng output của revision đó. Có thể dùng FFmpeg cài từ package manager của hệ điều hành; imageio-ffmpeg cũng cung cấp executable.
