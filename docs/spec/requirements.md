# Nguồn yêu cầu và tiêu chí nghiệm thu

Tác giả: Nguyễn Văn Đăng · 2A202603371 · L3A.
Nguồn: https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW.
Nội dung PRD-0 và Ticket-02/03/04 được học viên cung cấp nguyên văn trong phiên làm việc ngày 21/11/2026 sau khi truy cập trực tiếp trả HTTP 403. Các mốc tag phản ánh thời điểm triển khai thực tế, không hồi tố mốc giờ lab.

## Phase 1 — PRD-0 / contract 1.0
- Game 3D góc nhìn thứ ba; Mây đội nón lá, mang đèn, chạy và nhảy trên Đảo Bến; 5 đèn.
- Nhặt đom đóm, nạp đèn, Bóng Mực đuổi/gây mất Ngọn Lửa; Tỏa Sáng xua và làm choáng.
- Thắp đủ đèn thắng, hết máu hoặc hết giờ thua; HUD, điểm, chơi lại.
- game.contract.json khai đúng tuning; CLI không GPU, 60 tick/s; snapshot 0 trước input, bước k tạo tick k+1.
- Input có tính lưu giữ, nút theo cạnh lên; move chuẩn hóa, camera yaw đúng công thức XZ.
- Scenario thay thế motes/shades, cập nhật lantern theo id; không phát sự kiện/cộng điểm khi dựng.
- Snapshot/event/end đúng trường và thứ tự; lỗi định dạng exit 2; cùng seed cho output y hệt.

## Phase 2 — Ticket-02 / contract 1.1
- Chuẩn: chạy 6; nhảy 7, gravity -20; lướt 14 trong 12 tick, cooldown 90; nhặt XZ≤1 và cao≤1.5.
- Đèn cost10, interact2, safe6; pulse cost3, bán kính 3D5 (tâm chân+0.8), stun120, push4/15tick, cooldown180.
- Shade speed4 (night3=4.5), phát hiện12/bỏ18, hit XZ≤1/cao≤1.5, recoil2/60tick, invuln90.
- Hit rơi floor(carried/2) ở vòng1.5–2.5, TTL480; fall Y<-10 bỏ qua invuln, mất toàn bộ, respawn sau60tick.
- 20 motes khác điểm ban đầu, cap30, thêm mỗi240tick; shade 2 ở300, rồi mỗi480/420/360tick; cap6/8/10.
- Ba map đúng vị trí/độ cao/vách/dốc/bục trong ticket. Wind night3: báo trước2s, mỗi30s thổi5s, 2m/s.
- Drifter night2/3 mỗi1200tick, cap2; idle2/chase7/flee7; steals3, flee240; pulse trả đồ, biến mất120tick.
- Charm600tick, run7.2 và dash không cooldown; respawn2700tick; vị trí chuẩn.
- Menu → giới thiệu → chơi → kết quả → đêm kế; thua retry; tổng điểm chỉ cộng đêm thắng.
- Pause dừng mọi logic, tick vẫn tăng; settings volume/sensitivity lưu; âm thanh đủ sự kiện; HUD và bảng màu chuẩn.
- Scenario/snapshot đầy đủ vel, grounded, cooldown, charms, drifters, motes, wind; chạy21600tick≤30s.
- Test mới cho dash, map2/3, fall, charm, drifter, pause, wind và regression.

## Phase 3 — Ticket-03 / contract 1.2
- Dầu100, decay1/s theo đơn vị1/60; tắt khi≤0, reset deposited; relight5; refill10/mote.
- Đèn đầy dầu không nhận tương tác; chọn gần nhất/id; ever_lit và relit_count.
- Chỉ safe khi fuel≥30; wander tìm đèn yếu gần nhất; drain khi≤2, hút5/s/con; chase khi player≤6.
- Giảm dầu và xét tắt trước movement/input gameplay; pulse làm gián đoạn drain.
- Night240/270/300; không thắng sớm; bình minh sống + đủ ceil(0.6*n) đèn; no_flames luôn ưu tiên.
- Capacity=min(20,10+2*successful_lights), scenario lit không tăng capacity.
- Điểm thay toàn bộ: mote nạp5; first100/relight40; stun5/drain-stun15; dawn50+floor(fuel)/đèn và50/flame.
- Colorblind lưu: shade #00B3FF, danger trắng + ⚠; đèn tắt xẹp20%/rách, lowfuel chớp1Hz.
- ADR và changelog nêu test all_lit cũ được thay bằng dawn_survived.

## Phase 4 — Ticket-04 / contract 1.3
- Benchmark cửa sổ1280×720: night1, 200 wander shades,100 motes, L1–3 lit100; tắt spawn/hit/pickup/decay/end.
- Camera (30cosθ,15,30sinθ) nhìn origin,15s/vòng; warmup3s; đo đúng duration; FPS tính từ dt thực.
- bench.json: avg_fps,p1_low_fps,p95,frames,load_ms,peak_mem_mb(null web),vsync_off,renderer,os.
- Soak một process10nights xoay1→2→3, seed7+i, đổi hướng mỗi30tick; xác suất jump .05/dash .03/pulse .02/interact .1 mỗi tick.
- Soak ghi RSS sau load đêm đầu và sau reset đêm cuối, crashes, results, duration; ngưỡng≤1.2×.
- Leaderboard local top10: name regex3–12, score tổng đêm thắng, nights_won, achieved_at ISO timezone,seed; tie thời gian sớm.
- Export qua run_cmd --export-leaderboard; remap đủ9hành động, báo trùng, reset, lưu.
- Captions/hướng shade spawn/wind warning/10s/lowfuel; reduce-motion; chữ≥18px và large×1.25.
- README≤3lệnh có screenshot, systems,controls,test/headless/bench/soak; changelog4phase,credits,license.
- Release v1.0.0 bản web chạy được; bench/soak thật; retro1–2trang; mp4<5phút chơi+test+headless+bench.

## Giả định cần minh bạch
- Cạnh đảo và bề mặt dùng va chạm điểm chân, tower là trụ đặc bán kính2. Không có bán kính capsule bổ sung.
- Thứ tự bằng nhau dùng so sánh id tự nhiên (L2 trước L10, S2 trước S10).
- Hướng góc map là (r*cosθ, y, r*sinθ). Không có điểm spawn hợp lệ thì bỏ lượt.
- Rơi: tick phát hit bắt đầu chờ; 60 bước tiếp theo mới hồi sinh. Motes mới rơi/sinh không nhặt cùng tick.
- Chu kỳ gió báo trước tại tick1680, bắt đầu1800, hết2100; hướng chốt lúc báo trước.
- Browser không tắt được vsync theo API web; benchmark khai false và peak_mem_mb=null; không suy diễn đạt máy chấm.
- Chỉ khai số đo token nếu có telemetry; phiên này không cung cấp bộ đếm token/chi phí thực tế.
