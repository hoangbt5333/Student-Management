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

### Vì sao dùng cấu trúc này?

- **Chia theo feature (`features/students`)**: mã nguồn giao diện, nghiệp vụ và dữ liệu liên quan đến sinh viên ở cùng một khu vực. Khi bổ sung feature khác, có thể tạo feature riêng mà không gom tất cả màn hình vào một thư mục dùng chung.
- **Tách `core` khỏi feature**: interceptor và dịch vụ dùng xuyên ứng dụng (loading, thông báo lỗi) không thuộc riêng nghiệp vụ sinh viên, nên được đặt ở `core`.
- **Tách `components` khỏi `data-access`**: component tập trung trình bày và nhận thao tác của người dùng; service/store xử lý truy cập API và trạng thái. Cách tách này giúp UI ít phụ thuộc vào chi tiết HTTP và dễ kiểm thử hơn.
- **Dùng Facade giữa component và store**: `StudentListComponent` gọi các thao tác và đọc trạng thái qua `StudentFacade`, thay vì tự quản lý các luồng HTTP hoặc phụ thuộc trực tiếp vào cấu trúc bên trong store. Đây là lớp điều phối mỏng, giữ kiến trúc hiện tại đơn giản nhưng tạo ranh giới rõ giữa UI và state.
- **Lazy-load route theo feature**: `app.routes.ts` nạp `students.routes.ts` khi mở `/students`; mã feature được tách khỏi phần tải ban đầu và có thể mở rộng độc lập.

## Luồng dữ liệu sinh viên

```text
StudentListComponent
        │ thao tác / trạng thái
        ▼
StudentFacade
        │ ủy quyền nghiệp vụ
        ▼
StudentStore ───────► StudentService ───────► REST API
        │                   ▲
        └── state dẫn xuất ─┘
            tìm kiếm / lọc / sắp xếp / phân trang
```

1. `StudentListComponent` yêu cầu tải danh sách khi được khởi tạo.
2. `StudentFacade` chuyển lệnh tới `StudentStore`; store dùng `StudentService` để gọi API.
3. Store giữ dữ liệu sinh viên, trạng thái loading/lỗi/thành công và các tùy chọn danh sách. Các kết quả đã lọc, sắp xếp, số trang và trang hiện tại được tính từ state bằng computed signals.
4. Component danh sách truyền dữ liệu cần hiển thị xuống `StudentTable`; bảng phát sự kiện sửa/xóa lên component cha. `StudentForm` nhận sinh viên cần sửa và phát dữ liệu khi lưu.
5. Sau khi thêm hoặc cập nhật thành công, store tải lại danh sách để giao diện phản ánh dữ liệu từ API. Trạng thái trang được giới hạn hợp lệ; bộ lọc được bỏ nếu giá trị lọc không còn trong dữ liệu mới.

## Công nghệ áp dụng

| Công nghệ | Áp dụng ở đâu | Vì sao dùng |
| --- | --- | --- |
| **Angular 22 và TypeScript** | Toàn bộ ứng dụng trong `src/app`, cấu hình build trong `angular.json` | Angular cung cấp framework component, DI, router và forms; TypeScript giúp mô tả rõ model, input/output và kiểu state. |
| **Standalone components và Angular Router** | `app.ts`, các component trong `features/students/components`, `app.routes.ts`, `students.routes.ts` | Không cần gom component vào NgModule; route theo feature giúp tổ chức và lazy-load màn hình. |
| **Angular Signals** | State/UI trong `StudentStore`, `StudentFacade`, component và `LoadingService` | Cập nhật trạng thái phản ứng trực tiếp; computed signals phù hợp với dữ liệu dẫn xuất như kết quả lọc và phân trang. |
| **NgRx Signal Store** | `features/students/data-access/student.store.ts` | Quản lý state theo một nơi, gom state, computed state và thao tác nghiệp vụ, nhưng vẫn dùng mô hình Signals thay vì thiết lập một hệ thống action/reducer lớn cho feature nhỏ. |
| **RxJS và `HttpClient`** | `StudentService`, các thao tác bất đồng bộ trong store, HTTP interceptors | HTTP trả về Observable; các operator như `switchMap`, `catchError`, `finalize` điều phối chuỗi request, xử lý lỗi và kết thúc trạng thái loading. |
| **Reactive Forms** | `student-form` | Khai báo validator và trạng thái form trong TypeScript; thích hợp cho form thêm/sửa có kiểm tra dữ liệu. |
| **HTTP interceptors** | `core/interceptors`, được đăng ký ở `app.config.ts` | Xử lý cross-cutting concerns của HTTP tại một điểm. `loadingInterceptor` quản lý loading toàn cục; `errorInterceptor` chuyển lỗi HTTP thành thông báo dùng chung. `clientHeaderInterceptor` hiện có nhưng chưa được đăng ký. |
| **Angular SSR và hydration** | `server.ts`, `main.server.ts`, `app.config.server.ts`, `app.config.ts`, `app.routes.server.ts` | Cấu hình server-side rendering/prerender và hydration phía trình duyệt; Angular CLI build cả browser và server bundles. |
| **Express** | `server.ts` | Cung cấp Node server để phục vụ static assets và chuyển request trang tới Angular SSR engine. Đây là server render giao diện, không phải REST API sinh viên. |
| **Vitest và Angular CLI unit-test builder** | Các file `*.spec.ts`, cấu hình test trong `angular.json` | Chạy unit test của Angular và kiểm thử store/API bằng HTTP testing utilities. |

## Mở rộng feature

Khi thêm feature, nên đặt route và component cùng miền nghiệp vụ bên trong `src/app/features/<feature-name>/`; chỉ đưa logic dùng chung thực sự lên `core`. Với luồng dữ liệu, giữ component tập trung vào UI, dùng service cho giao tiếp API và expose trạng thái/thao tác qua facade/store theo nhu cầu của feature.
