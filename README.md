# Đảo Đèn Lồng

**Nguyễn Văn Đăng · 2A202603371 · L3A** — Day 12 AI SDLC Lab.

Game 3D góc nhìn thứ ba: cùng Mây gom đom đóm, thắp đèn và tránh Bóng Mực giữa biển mây. Bản hiện tại: Phase 2 / Test Contract 1.1. Ba Đêm: Đảo Bến, Đảo Cau, Đảo Chuông.

## Chạy trên Windows, macOS hoặc Linux

Yêu cầu Node.js ≥22.12, npm, trình duyệt desktop có WebGL 2. Không cần API key.

```bash
npm ci
npm run build
npm start
```

Mở http://127.0.0.1:5173. Phát triển: `npm run dev`. Toàn bộ asset cục bộ, không tải CDN lúc chơi.

## Điều khiển

WASD: di chuyển theo camera · Space: nhảy · Shift: lướt · E: nạp ánh sáng · Q: tỏa sáng · Esc/P: tạm dừng. Giữ chuột phải và kéo để xoay camera. Thua chơi lại Đêm, thắng tiếp Đêm kế. Âm lượng và độ nhạy lưu cục bộ.

## Luật và điểm Phase 1

5 đèn, mỗi đèn cần10 đom đóm, sức chứa10. Nạp mỗi đom đóm +10; thắp đèn +100; mỗi Bóng Mực trúng pulse +5. Thắng khi thắp hết đèn: cộng floor(giây còn)*2 +50/Ngọn Lửa còn. Hết Ngọn Lửa hoặc hết giờ thì thua. Tuning khai đầy đủ trong game.contract.json.

## Kiểm chứng và headless

```bash
npm test
npm run verify -- --phase phase-1
node scripts/headless.mjs --seed 42 --night 1 --ticks 18000 --out run.jsonl --snapshot-every 10
```

CLI thêm `--scenario file.json --inputs file.json`. Không cần cửa sổ/GPU, chạy đúng60tick/s mô phỏng, không chờ thời gian thực. Input chỉ cập nhật trường có mặt, hành động theo cạnh false→true. Lỗi định dạng exit2; lỗi hệ thống exit1. Ví dụ và bằng chứng: docs/proof/phase-1. Không tuyên bố đạt các test ẩn chưa được cung cấp.

## Sáng tạo của tôi

Mây mang nón lá và đèn nhỏ, đảo có cỏ thủ công bằng hình học, biển mây và bầu trời sao. Lời Ông Đăng ở màn giới thiệu gợi cảm giác cổ tích Việt Nam. Chi tiết này chỉ nằm ở phần hiển thị, không tạo thêm thực thể mô phỏng hoặc thay output headless.

## Tài liệu

- [Yêu cầu và acceptance criteria](docs/spec/requirements.md)
- [Ghi chép Phase 1](docs/notes/phase-1.md)
- [Changelog](CHANGELOG.md), [Credits](CREDITS.md), [License](LICENSE)
- [Đề bài gốc](docs/lab/README.md), [Guide](GUIDE.md), [Rubric](RUBRIC.md), [Submission](SUBMISSION.md), [Rules](RULES.md)

Thời điểm commit/tag là thời điểm triển khai thực tế; không backdate. README đề bài gốc được giữ trong docs/lab/README.md.
