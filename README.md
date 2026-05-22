# bai tap cuoi ki
🧘 PoseAlert — Hệ Thống Cảnh Báo Tư Thế Ngồi Học (AIoT)
PoseAlert là một ứng dụng web thông minh sử dụng trí tuệ nhân tạo (AI) để giám sát và cải thiện tư thế ngồi học của sinh viên. Dự án kết hợp công nghệ nhận diện hình ảnh với các phương pháp quản lý thời gian khoa học nhằm bảo vệ sức khỏe cột sống và thị lực.

🚀 Tính Năng Chính
1. Nhận Diện Tư Thế Thời Gian Thực (AI Pose Detection)
Sử dụng mô hình Teachable Machine Pose từ Google để nhận diện 4 trạng thái chính: Ngồi đúng, Cúi đầu, Vẹo lưng, và Mắt quá gần.

Hiển thị khung xương (skeleton) và độ tin cậy (%) của mô hình ngay trên giao diện camera.

2. Hệ Thống Cảnh Báo Thông Minh
Cơ chế Timer: Chỉ kích hoạt cảnh báo nếu người dùng duy trì tư thế sai liên tục trong 30 giây, tránh gây phiền nhiễu bởi các cử động nhất thời.

Đa phương thức: Cảnh báo qua âm thanh (Web Audio API) và Popup trực quan trên màn hình.

3. Dashboard Thống Kê Chi Tiết
Biểu đồ tròn: Theo dõi tỷ lệ phần trăm các tư thế trong suốt phiên học.

Biểu đồ đường: Ghi lại lịch sử chất lượng tư thế mỗi 5 giây để người dùng theo dõi tiến trình.

Nhật ký (Alert Log): Lưu lại thời gian cụ thể của các lần vi phạm tư thế.

4. Tích Hợp Phương Pháp Pomodoro
Bộ đếm ngược 25 phút tập trung và 5 phút nghỉ ngơi.

Tự động nhắc nhở người dùng đứng dậy vận động sau mỗi chu kỳ học tập.

🛠 Công Nghệ Sử Dụng
Frontend: HTML5, CSS3 (Giao diện Dark Mode, Responsive), JavaScript (ES6+).

AI/ML: TensorFlow.js & Teachable Machine.

Data Visualization: Chart.js (Vẽ biểu đồ động).

Audio: Web Audio API (Tạo âm thanh chuông báo bằng code).

📦 Hướng Dẫn Cài Đặt & Chạy
Huấn luyện mô hình:

Truy cập Teachable Machine Pose.

Tạo 4 lớp: Ngồi đúng, Cúi đầu, Vẹo lưng, Mắt quá gần.

Export model và chọn Upload my model để lấy đường dẫn URL.

Cấu hình Code:

Mở tệp script.js.

Tìm biến MODEL_URL (dòng 23) và thay thế bằng URL model của bạn.

JavaScript
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/CUA_BAN_TAI_DAY/";
Khởi chạy:

Mở tệp index.html bằng trình duyệt (Khuyên dùng Chrome).

Cho phép quyền truy cập Camera và nhấn "Bắt đầu".

📁 Cấu Trúc Thư Mục
index.html: Cấu trúc giao diện và layout chính.

style.css: Thiết kế giao diện theo phong cách Dark Tech & AIoT.

script.js: Xử lý logic AI, Timer, Thống kê và Pomodoro.

README.md: Tài liệu hướng dẫn dự án.

👨‍💻 Tác Giả
Sinh viên thực hiện: [Tên của bạn]

Môn học: [Tên môn học, ví dụ: Nhập môn AIoT]

Đơn vị: [Tên trường/khoa của bạn]