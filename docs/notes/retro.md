# Retro — Đảo Đèn Lồng

Nguyễn Văn Đăng · MSSV2A202603371 · L3A · Day12 AI SDLC.

## Điều đã làm và cách đánh giá

Phase1 biến PRD tổng quát thành game Đảo Bến3D và CLI tất định. Dùng cùng một lớp Game cho Node và renderer, tách vị trí mô phỏng chân nhân vật khỏi độ cao bay của đồ họa. Kiểm tra move6m sau60tick, yaw, pickup/capacity, edge tương tác, pulse3D, hit, thắng/thua và byte-determinism. Tám test đầu và browser smoke được lưu ở tagphase-1.

Phase2 đưa toàn bộ số liệu chuẩn vào tuning, thêm ba map, dash, pad/bridge/ramp/tower, charm, drifter, wind và pause. Các scenario mới chạy qua CLI thật và được lưu cả input lẫn JSONL. Mười bảy test và browser smoke ở tagphase-2. Một lỗi hồi quy đáng chú ý là AI kéo shade từ cao độ scenario7m xuống mặt đất, gây hit dù pulse3D trước đó loại mục tiêu này. Assertion cũ phát hiện lỗi; sửa bằng giữ cao độ tương đối, thêm quy tắc vào AGENTS.md.

Phase3 thay mô hình đèn sáng vĩnh viễn bằng fuel nguyên1/60; thêm ever_lit, relit_count và capacity theo lần thắp. Thay nhánh thắng sớm bằng dawn≥60%, giữ no_flames ưu tiên. ADR-001 ghi3nhóm assertion thay đổi (thời lượng, điểm, all_lit), không skip test cũ âm thầm. Hai mươi ba test và14scenario xác nhận decay/out/refuel/relight/drain/safe/dawn trong tagphase-3.

Phase4 bổ sung benchmark/soak có số đo thật, xếp hạng local, accessibility, server không dependency, đóng gói và video. Regression review phát hiện recoil giảm timer trước movement nên thiếu bước cuối (59/60); sửa để đủ2m/60tick và thêm assertion. Drifter từng dùng chung vòng rơi đồ của hit, nhưng ticket yêu cầu trả tại chỗ: tách đường này và thêm test tọa độ/TTL. Browser kiểm tra setting lưu sau reload, phím trùng và luồng lưu điểm.

Kiểm tra cuối bổ sung scenario shade có tâmY0 đúng ví dụ contract: collision không được giả định center luôn cao0.8m. Bản cuối có33test đạt, không skip; soak0crash, RSS tăng khoảng9.8%; benchmark GPU khoảng120FPS trung bình và112FPS1%low (tham khảo). ZIP chạy không node_modules và video đã decode thành công.

## Điều hiệu quả khi làm với AI

Lõi không phụ thuộc DOM/GPU giúp kiểm chứng nhanh và tái dùng toàn bộ logic. Seed riêng khiến bug có thể tái lập bằng một file scenario nhỏ. Chốt các boundary thành assertion sớm hiệu quả hơn đọc mô tả “đã chạy”. Ưu tiên đặc tả bắt buộc trước phần trang trí; hình học procedural và âm thanh tổng hợp giúp không phụ thuộc asset/CDN và dễ ghi credits.

Harness hữu ích nhất là AGENTS.md ngắn và skill verify-game: yêu cầu test/build thành công trước tag; verify.mjs ghi stdout/stderr/exit code thật và dừng nếu đỏ. CI trên Linux/macOS chạy test/build. Công cụ npm audit phát hiện phiên bản fflate cũ có advisory, nên nâng0.8.3; audit sau nâng không có vulnerability tại thời điểm chạy.

Điều chưa hiệu quả: truy cập lab board403 làm tốn một vòng tra cứu; chuyển ngay sang nội dung học viên dán để không đoán luật. Khi mở rộng, helper “di chuyển trên đất” và “rơi đồ” dùng chung quá rộng đã làm sai ý nghĩa scenario/loại sự kiện. Nếu làm lại, ghi invariant cao độ và nguồn rơi đồ ngay tại biên API, thêm boundary test trước khi nối GUI.

## Số đo và chi phí

Số kiểm chứng cuối, FPS, load và RSS nằm trong docs/proof/phase-4, bench.json và soak.json, không chép số liệu sửa tay. Software renderer và GPU được ghi riêng để tránh kết luận sai về hiệu năng. Browser không đo RSS tiến trình hoặc tắt vsync được nên khai null/false như contract cho phép.

Token/chi phí từng phase và tổng: **không xác định** vì công cụ phiên làm việc không cung cấp telemetry/billing. Không tạo con số ước lượng không có căn cứ. Cách tiết kiệm: một simulation, không tải asset lớn; dùng test/scenario nhỏ; đọc tài liệu theo nhóm; không chạy thêm agent; chỉ chạy lại phép đo khi code/đóng gói hoặc mục tiêu kiểm chứng thay đổi.

## Bước tiếp theo nếu có thêm thời gian

Nhờ một người khác playtest và review độc lập, chạy test ẩn của giảng viên, đo lại trên máy chấm macOS/Linux được công bố. Làm rõ mâu thuẫn spawnorigin ở Đêm3 với tầng/tower tại origin; giả định hiện tại đã ghi rõ. Chất lượng hình học và âm nhạc có thể tiếp tục cải thiện, sau khi xác nhận mọi boundary với bộ chấm. Không tuyên bố reviewer độc lập, test ẩn hay chứng nhận hiệu năng máy chấm khi chưa có bằng chứng.
