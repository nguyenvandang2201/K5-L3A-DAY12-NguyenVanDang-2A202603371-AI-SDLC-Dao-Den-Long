# Phase 1 — Evaluation

Nguyễn Văn Đăng · 2A202603371 · L3A.

## Giả định và thiết kế
Chọn JavaScript ES modules, Three.js + Vite cho bản web; Node.js chạy cùng logic không DOM/GPU. Dùng ngay các số liệu tương thích Ticket-02 cho cơ chế đã biết để giảm rủi ro đổi tuning; Phase 1 chỉ có Đêm 1, chưa có dash, charm, drifter hay dầu đèn. Đom đóm không cộng điểm khi nhặt; chỉ cộng khi nạp. Phạt rơi được bật và khai trong contract.

## Truy vết
| Yêu cầu | Kiểm chứng |
|---|---|
| Move, camera yaw, chuẩn hóa | phase1.test.mjs: 60 bước phải dịch đúng 6m |
| Nhặt, sức chứa, nạp nhiều lần | Test bán kính biên, đủ capacity, edge và tie id |
| Pulse, hit, invulnerability | Test mục tiêu 3D, không hit khi stunned, hit một lần |
| Thắng/thua/điểm | Test dựng scenario không cộng điểm, all_lit, ưu tiên no_flames |
| JSONL, seed, lỗi | Test chạy CLI thật 2 lần so byte; invalid JSON exit2 |
| Bản chơi 3D | Browser smoke và ảnh screenshot trong docs/proof/phase-1 |

## AI và giới hạn
Codex triển khai; npm test và build kiểm chứng độc lập bằng assertions/exit code, chưa có người khác review. Không tuyên bố test ẩn đạt. Token/chi phí: không có telemetry nên chưa xác định, không điền số giả. Tiết kiệm bằng một lõi mô phỏng chung và scenario nhỏ.

Yêu cầu phase được cung cấp đồng thời; tag tạo tuần tự sau kiểm chứng thực tế, không giả lập lịch 4 giờ quá khứ.
