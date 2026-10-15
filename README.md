# User Management

Ứng dụng quản lý sinh viên được xây dựng bằng Angular. Hiện feature sinh viên hỗ trợ thêm, sửa, xóa, tìm kiếm, lọc theo lớp/khoa, sắp xếp và phân trang.

## Yêu cầu

- Node.js phiên bản tương thích với Angular CLI 22.
- npm.
- Một REST API chạy tại `http://localhost:3000` và cung cấp tài nguyên `/students`. Backend API không nằm trong repository này.

## Cài đặt và chạy

```bash
npm install
npm run start
```

Mở `http://localhost:4200`. Lệnh `npm run start` chạy Angular development server; API sinh viên vẫn cần được khởi động riêng.

API được `StudentService` gọi theo các endpoint:

| Thao tác | HTTP | Endpoint |
| --- | --- | --- |
| Tải danh sách | `GET` | `/students` |
| Thêm sinh viên | `POST` | `/students` |
| Cập nhật sinh viên | `PUT` | `/students/:id` |
| Xóa sinh viên | `DELETE` | `/students/:id` |

Mỗi sinh viên có `id`, `name`, `email`, `phone`; các trường `className` (lớp) và `faculty` (khoa) hiện có thể thiếu trong dữ liệu cũ. Khi cập nhật hoặc thêm mới, API cần lưu và trả lại các trường được gửi lên.

## Lệnh thường dùng

```bash
# Chạy ứng dụng ở chế độ phát triển
npm run start

# Build production (bao gồm cấu hình server-side rendering)
npm run build

# Chạy unit test bằng Angular CLI và Vitest
npm test

# Build lại khi mã nguồn thay đổi
npm run watch
```

Sau khi build, có thể chạy server SSR bằng:

```bash
npm run serve:ssr:user-management
```

Server mặc định lắng nghe tại cổng `4000` (hoặc cổng được đặt qua biến môi trường `PORT`).

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
│   │   └── students/
│   │       ├── components/
│   │       │   ├── student-form/
│   │       │   ├── student-list/
│   │       │   └── student-table/
│   │       ├── data-access/
│   │       │   ├── models/
│   │       │   ├── student.facade.ts
│   │       │   ├── student.store.ts
│   │       │   └── student.ts
│   │       └── students.routes.ts
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
