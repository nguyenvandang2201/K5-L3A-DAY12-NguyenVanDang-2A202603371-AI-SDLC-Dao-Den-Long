# Phase 2 — Evaluation

## Phạm vi và acceptance criteria
Theo docs/spec/requirements.md, mỗi tính năng mới có scenario CLI lưu trong docs/proof/phase-2: dash, pause, fall/respawn, charm, drifter/return, pad/bridge và wind night3. Test bổ sung xác nhận số bước/cooldown, địa hình chuẩn, spawn tick300 và thứ tự steal trước hit. Menu/settings/audio/HUD kiểm tra qua browser và đọc screenshot.

## Quyết định và lỗi phát hiện
Vận tốc bục được giữ riêng, input không ghi đè tới khi đáp; dash tạm thay vận tốc ngang và đóng băng cao độ. Địa hình dùng cùng hàm ở renderer và simulation. Pause có outer tick và sim_tick riêng.

Regression phát hiện Bóng Mực đặt ở cao độ7m bị hàm đi trên đất kéo ngay xuống0.8m, làm hit sai sau pulse. Sửa bằng giữ chênh cao scenario và chỉ cộng độ thay đổi địa hình; giữ nguyên assertion 3D của Phase1. Harness thêm điều này trong AGENTS.md.

## Giả định
Map3 mặc định chân (0,0,0) để giữ contract; ở bước đầu nếu dưới mặt tầng sẽ đặt lên mặt hỗ trợ Y6. Tower chặn từ ngoài, cho nhân vật khởi tạo bên trong đi ra. Đây là cách xử lý hai mô tả mâu thuẫn (spawn origin và tầng/tower tại origin); scenario có thể đặt chân đúng tầng rõ ràng.

Không có telemetry token/chi phí; không suy đoán con số. Không có người/agent khác review nên chưa nhận tiêu chí reviewer độc lập. FPS trên máy GPU của giảng viên chưa đo ở phase này; browser smoke dùng software renderer.
