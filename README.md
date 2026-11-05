# Student Management System

Ứng dụng Angular quản lý sinh viên và các dữ liệu liên quan: lớp học, giảng viên, môn học, điểm và tài khoản người dùng. Ứng dụng dùng JSON Server làm REST API mock cho môi trường phát triển; đây không phải backend phù hợp để triển khai thực tế.

## Công nghệ

- Angular 22, TypeScript và Angular Router (standalone, lazy-loaded feature routes)
- Angular Signals, NgRx Signal Store và RxJS
- Reactive Forms và `HttpClient`
- Angular SSR, prerender và client hydration
- Vitest thông qua Angular CLI unit-test builder
- JSON Server làm API mock (không nằm trong dependencies của dự án)

## Chức năng và truy cập

- Quản lý sinh viên, lớp, giảng viên, môn học, điểm và tài khoản.
- Dashboard; danh sách sinh viên hỗ trợ tìm kiếm, lọc, sắp xếp và phân trang.
- Đăng nhập demo; trạng thái đăng nhập được lưu ở phía trình duyệt.
- Các trang dashboard, sinh viên, lớp, giảng viên, môn học và điểm yêu cầu đăng nhập.
- `/users` giới hạn cho Admin; `/grades` giới hạn cho Admin và giảng viên. Người không đủ quyền được chuyển đến `/forbidden`.

Các kiểm tra đăng nhập và vai trò chỉ chạy ở client, không bảo vệ REST API. Không dùng cơ chế này làm xác thực/phân quyền cho sản phẩm thực tế.

## Kiến trúc

Luồng dữ liệu ở các feature: `Component → Facade → Store → Service → REST API`.

- **Components** hiển thị giao diện và gọi Facade.
- **Facades** cung cấp trạng thái và thao tác cho Components.
- **Signal Stores** quản lý state, state dẫn xuất và các luồng bất đồng bộ.
- **Services** thực hiện HTTP với `HttpClient`.

Các feature nghiệp vụ nằm trong `src/app/features/` (students, classes, teachers, subjects, grades và users). Những phần dùng chung như xác thực, route guards, HTTP interceptors và dịch vụ thông báo nằm trong `src/app/core/`; SSR và cấu hình router ở cấp ứng dụng nằm trong `src/app/`.

## Cài đặt và chạy

Cần cài Node.js tương thích với Angular CLI 22 và npm. Chạy các lệnh từ thư mục gốc repository.

```bash
npm install
npm start
```

Ứng dụng Angular mặc định chạy tại `http://localhost:4200`. Các service hiện gọi API tại `http://localhost:3001`, vì vậy cần khởi động JSON Server riêng trong một terminal khác, trỏ tới file `db.json` ở thư mục gốc:

```bash
npx json-server --watch db.json --port 3001
```

`json-server` không được khai báo trong `package.json`; lệnh trên chỉ chạy được khi công cụ có sẵn hoặc được `npx` tải về. Phiên bản JSON Server chưa được khóa trong dự án.

## API được ứng dụng sử dụng

| Dữ liệu | Endpoint | Phương thức được service sử dụng |
| --- | --- | --- |
| Sinh viên | `/students` | GET, POST, PUT, DELETE |
| Lớp học | `/classes` | GET, POST, PATCH, DELETE |
| Giảng viên | `/teachers` | GET, POST, PUT, DELETE |
| Môn học | `/subjects` | GET, POST, PUT, DELETE |
| Điểm | `/grades` | GET, POST, PUT |
| Người dùng | `/users` | GET, POST, PUT, PATCH |

Điểm tham chiếu sinh viên và môn học qua `studentId` và `subjectId`; form giới hạn điểm từ 0 đến 10. Điểm trung bình được tính từ các điểm hợp lệ trong state ứng dụng, không lưu thành một trường riêng trong API. JSON Server không thực thi quan hệ khóa ngoại.

## Tài khoản demo

Các tài khoản dưới đây được khai báo trong `db.json`, chỉ dùng cho môi trường local:

| Vai trò | Tên đăng nhập | Mật khẩu |
| --- | --- | --- |
| Admin | `admin` | `Admin123!` |
| Giảng viên | `gv001` | `Gv123456!` |
| Sinh viên | `sv001` | `Sv123456!` |

File dữ liệu mock lưu mật khẩu dạng văn bản thuần. Không dùng các tài khoản hoặc cách xác thực này ngoài mục đích phát triển và kiểm thử.

## Lệnh thường dùng

```bash
npm start             # Chạy Angular dev server
npm run build         # Build production browser và server bundles
npm test              # Chạy unit test tương tác
npm run test:ci       # Chạy unit test không ở chế độ watch
npm run check:arch    # Kiểm tra ranh giới kiến trúc
npm run verify        # Chạy check:arch, build và test:ci
npm run watch         # Build lại khi mã nguồn thay đổi
```

Chạy các kiểm tra chất lượng trước khi xem thay đổi là hoàn tất:

```bash
npm run verify
```

## SSR

Build ứng dụng bằng `npm run build`, sau đó chạy Node server đã build:

```bash
npm run serve:ssr:user-management
```

Server mặc định lắng nghe cổng `4000`; có thể đổi cổng bằng biến môi trường `PORT`. Cấu hình render prerender các route còn lại và chuyển trang chi tiết sinh viên, lớp, giảng viên, môn học sang client rendering.

## Dữ liệu và giới hạn

- `students.classId` liên kết lớp; `subjects.teacherId` liên kết giảng viên; `grades.studentId` và `grades.subjectId` liên kết sinh viên và môn học.
- Các thao tác ghi thay đổi file `db.json`. Sao lưu file nếu cần giữ dữ liệu; không có lệnh reset dữ liệu riêng trong dự án.
- Ứng dụng hiện dùng URL API `http://localhost:3001` trực tiếp trong các service.
- JSON Server và xác thực phía client chỉ phục vụ demo. Một triển khai thực tế cần backend, xác thực/phân quyền phía máy chủ, lưu mật khẩu an toàn và kiểm tra dữ liệu ở phía server.
