# Phase 4 — Evaluation và bàn giao

## Kiểm chứng
- npm test bao phủ hồi quy, công thức metric, cảnh benchmark, leaderboard/validation, HTTP origin, đầy đủ recoil và trả đồ drifter tại chỗ.
- npm run browser chạy bản dist qua server riêng: menu/intro/move/jump/pause, đo FPS chơi thường120frames, đổi phím/trùng/reset, setting vẫn còn sau reload, scenario night2/3 và loss→save→leaderboard.
- bench.json tạo bằng scripts/bench.mjs, viewport1280×720, warmup3s rồi30s đo, actual WebGL renderer. Phân vị nearest-rank95 và k=ceil(.01N) cho1%low.
- soak.json tạo bằng một process Node, 10Đêm, seed7+i, chỉ giữ chuỗi result chứ không giữ world cũ. Đo RSS sau load đầu và sau reset cuối; GC rõ trong soak_cmd.
- docs/proof/phase-4 chứa logs,14scenario CLI, ảnh và metadata trình duyệt; demo thật trong docs/demo.
- ZIP đã được giải nén vào thư mục sạch không node_modules: server/JS/CSS chạy, ghi điểm lên đĩa và lệnh export khớp dữ liệu; xem release.json.
- Video MP4 1280×720 dài khoảng1phút34giây, đã decode kiểm tra và xem các frame gameplay/test/soak.

## Kết quả và giới hạn
Máy tham khảo: AMD Ryzen7 H255, Radeon780M, RAM khoảng30.8GiB, Windows. bench.environment.json ghi cấu hình và ngưỡng; máy chấm của giảng viên có thể khác. Bản software SwiftShader được giữ riêng trong docs/proof/phase-4/bench-software*; không dùng nó làm kết quả GPU.

Bản web không cung cấp quyền tắt vsync hoặc RSS tiến trình browser từ JavaScript: khai vsync_off=false và peak_mem_mb=null đúng contract, không thay bằng số heap JS.

Không có bộ test ẩn nên không khẳng định tất cả test ẩn đã đạt. Không có reviewer người/agent khác trong phiên nên không nhận là đã có review độc lập. Tất cả bằng chứng công khai là từ các lệnh chạy thật.

## Đóng gói
ZIP dựng sẵn có dist và server Node không dependency; giải nén, chạy node scripts/run.mjs. Repo đầy đủ dùng3lệnh npmci/build/start. Leaderboard server lưu .local/leaderboard.json và xuất bằng run_cmd; web tĩnh dùng localStorage.

Các tag tạo sau test/build thực, giữ nguyên lịch sử trước; không backdate thời hạn lab. Nhật ký token/chi phí không có telemetry nên để không xác định.
