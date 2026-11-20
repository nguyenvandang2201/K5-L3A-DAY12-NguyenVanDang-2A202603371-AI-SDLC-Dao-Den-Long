# Phase 3 — Evaluation

- ADR-001 ghi quyết định fuel nguyên1/60, lịch sử đèn, chiến thắng dawn và các test cũ bị thay.
- Test mới kiểm tra đúng60tick cạn1fuel, nhiều shade hút cộng dồn, sự kiện mỗi60tick, refuel ceil/cap, relight/capacity/điểm, threshold30, đẩy khỏi safe và thứ tự tick bình minh.
- Scenario CLI thật: fuel_out, refuel, relight, drain, cùng regression tất định các phase trước. Xem docs/proof/phase-3.
- Bảng màu dễ phân biệt lưu localStorage; mắt/viền shade xanh, UI cảnh báo trắng+⚠. Đèn tắt xẹp20% và vết rách; lowfuel chớp1Hz; thanh dầu đọc dữ liệu simulation.
- Không test nào bị skip; 3 assertion luật cũ được sửa với lý do trong ADR.
- Token/chi phí không có telemetry; chỉ ghi hoạt động thật. Ưu tiên tái dùng simulation/tests thay viết lại.
