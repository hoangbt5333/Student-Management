# Student Management Demo

Ứng dụng demo Angular quản lý sinh viên, lớp học, giảng viên, môn học và điểm số. Dự án giữ standalone components, lazy routes, Reactive Forms, HttpClient và Signal Store/facade hiện có.

## Yêu cầu

- Node.js phiên bản tương thích với Angular CLI 22.
- npm.
- Mock API JSON Server trong thư mục `../mock-api`, chạy tại `http://localhost:3001`.

## Cài đặt và chạy

Mở hai terminal:

```bash
cd mock-api
npm install
npm start
```

```bash
cd Student-Management
npm install
npm run start
```

Mở `http://localhost:4200`. Thanh điều hướng có Dashboard, Sinh viên, Lớp học, Giảng viên, Môn học và Điểm số.

### Đăng nhập và phân quyền

Tài khoản mẫu được đọc từ collection `users` trong `../mock-api/db.json`. Khi mở trang cần đăng nhập, ứng dụng chuyển đến `/login` và quay lại URL ban đầu sau khi đăng nhập thành công. Dashboard, sinh viên, lớp học, giảng viên, môn học và điểm số yêu cầu đăng nhập; `/users` chỉ dành cho Admin, còn `/grades` chỉ dành cho Admin và giảng viên. Tài khoản không đủ quyền được chuyển đến `/forbidden`. Chọn **Đăng xuất** để kết thúc phiên.

JSON Server cung cấp CRUD cho các collection sau:

| Thao tác | HTTP | Endpoint |
| --- | --- | --- |
| Dữ liệu | Collection |
| --- | --- |
| Sinh viên | `/students` |
| Lớp học | `/classes` |
| Giảng viên | `/teachers` |
| Môn học | `/subjects` |
| Điểm | `/grades` |

Điểm tham chiếu sinh viên/môn bằng ID và form kiểm tra khoảng 0–10. Không lưu lặp tên sinh viên hoặc tên môn trong bản ghi điểm.

## Lệnh thường dùng

```bash
# Chạy ứng dụng ở chế độ phát triển
npm run start

# Build production (bao gồm cấu hình server-side rendering)
npm run build

# Chạy unit test
npm test

# Build lại khi mã nguồn thay đổi
npm run watch
```

Sau khi build, có thể chạy server SSR bằng:

```bash
npm run serve:ssr:user-management
```

Server mặc định lắng nghe tại cổng `4000` (hoặc cổng được đặt qua biến môi trường `PORT`).

## Mô hình dữ liệu

- `students.classId` liên kết đến `classes.id`.
- `subjects.teacherId` liên kết tùy chọn đến `teachers.id`.
- `grades.studentId` và `grades.subjectId` liên kết đến sinh viên và môn học.
- Điểm trung bình được tính từ điểm hợp lệ, không lưu thêm trong API.

Model lớp ban đầu không có giảng viên chủ nhiệm nên quan hệ đó chưa được thêm. JSON Server không enforce foreign key; giao diện ngăn xóa giảng viên hoặc môn học đang được tham chiếu.

## Cấu trúc dự án

```text
src/
├── app/
│   ├── core/
│   │   ├── interceptors/
│   │   │   ├── client-header.interceptor.ts
│   │   │   ├── error.interceptor.ts
│   │   │   └── loading.interceptor.ts
│   │   └── services/
│   │       ├── loading.service.ts
│   │       └── notification.service.ts
│   ├── features/
│   │   ├── academics/  # Giảng viên, môn học, điểm và AcademicService
│   │   ├── classes/    # Danh sách và chi tiết lớp
│   │   ├── dashboard/
│   │   └── students/  # CRUD, danh sách và hồ sơ chi tiết
│   ├── app.config.server.ts
│   ├── app.config.ts
│   ├── app.routes.server.ts
│   ├── app.routes.ts
│   ├── app.html
│   └── app.ts
├── main.server.ts
├── main.ts
└── server.ts
```


