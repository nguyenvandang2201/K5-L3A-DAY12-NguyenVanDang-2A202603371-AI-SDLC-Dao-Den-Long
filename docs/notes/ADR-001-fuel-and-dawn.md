# ADR-001 — Dầu đèn và chiến thắng tại bình minh

Trạng thái: áp dụng Phase 3, thay luật PRD-0/Ticket-02 đúng Ticket-03.

## Quyết định
Mỗi đèn giữ fuelUnits nguyên (60 đơn vị =1fuel), ever_lit và relit_count. Tick đang sáng trừ1đơn vị và thêm5đơn vị cho mỗi shade đang drain; không tích lũy sai số float. Chỉ làm tròn khi snapshot. Khi≤0, tắt và reset deposited; lần thắp sau cần5, nhớ lịch sử. Lần đầu cần10. Châm dầu tăng600đơn vị/mote, tối đa6000.

Tách trạng thái lịch sử (ever_lit) khỏi trạng thái hiện tại (lit). successful_lights chỉ tăng khi một lần thắp thật hoàn thành; dựng scenario lit không có side effect. Capacity tính từ bộ đếm này và cap20.

Xét no_flames trước; chỉ xét tỷ lệ đèn tại cuối tick bình minh, sau giảm dầu, di chuyển, nhặt/nạp, hit và spawn. Không có nhánh all_lit nữa. Điểm thưởng chỉ cộng một lần khi chuyển sang won.

## Test bị thay thế
- Test Phase1 timeLeft sau60bước:299→239 vì night1 300→240s.
- Điểm nạp4con:40→20; một lần thắp tổng200→150 vì +5/mote.
- Test all_lit thắng ngay: thay bằng all_lit vẫn playing và dawn≥ngưỡng mới thắng.
- Test ưu tiên no_flames và mọi test movement/pulse/input vẫn giữ. Không skip test.

## Hệ quả
Vùng an toàn phụ thuộc fuelUnits≥1800. Shade wander có thể drain đèn yếu; pulse đọc state trước chuyển để tính15điểm. Renderer và HUD đọc cùng trạng thái dầu của simulation, không tự tính luật phụ.
