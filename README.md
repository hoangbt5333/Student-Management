# Student Management System

## 1. Giới thiệu

Ứng dụng quản lý đào tạo bằng Angular, hỗ trợ các nghiệp vụ sinh viên, lớp học, giảng viên, môn học và điểm. Dữ liệu hiện được cung cấp bởi `json-server` để phát triển và kiểm thử; đây chưa phải backend dành cho môi trường thực tế.

## 2. Công nghệ

- Angular 22 và TypeScript
- Angular Signals, NgRx Signal Store và RxJS
- Reactive Forms
- json-server 0.17
- Vitest cho unit test

## 3. Chức năng

- CRUD sinh viên, lớp, giảng viên, môn học và điểm
- Tìm kiếm, lọc, sắp xếp và phân trang danh sách
- Dashboard thống kê dữ liệu đào tạo
- Đăng nhập demo và phân quyền theo vai trò quản trị viên, giảng viên, sinh viên

## 4. Kiến trúc

Luồng dữ liệu chính: `Component → Facade → Store → Service`. Component đảm nhiệm giao diện; Facade cung cấp API cho component; Signal Store quản lý trạng thái; Service giao tiếp với REST API. Route guard và quyền theo vai trò kiểm soát các màn hình được truy cập.

## 5. Cài đặt và chạy

Cần cài Node.js tương thích với Angular CLI 22 và npm. Mở hai terminal tại thư mục workspace.

```bash
cd mock-api
npm install
npx json-server --watch db.json --port 3001
```

```bash
cd user-management
npm install
npm start
```

API mock chạy tại `http://localhost:3001`; ứng dụng Angular chạy tại `http://localhost:4200`. Các endpoint gồm `/students`, `/classes`, `/teachers`, `/subjects`, `/grades` và `/users`.

Chạy unit test bằng `npm test`, build bằng `npm run build`, hoặc build lại khi mã nguồn thay đổi bằng `npm run watch` trong thư mục `user-management`.

## 6. Tài khoản demo

Các tài khoản thử nghiệm trong `mock-api/db.json`, chỉ dùng ở môi trường local:

| Vai trò | Tên đăng nhập | Mật khẩu thử nghiệm |
| --- | --- | --- |
| Quản trị viên | `admin` | `Admin123!` |
| Giảng viên | `gv001` | `Gv123456!` |
| Sinh viên | `sv001` | `Sv123456!` |

Không sử dụng các tài khoản này ngoài mục đích kiểm thử. API mock lưu mật khẩu dạng văn bản thuần, không có xác thực an toàn và không phù hợp để triển khai công khai.

Khi mở trang cần đăng nhập, ứng dụng chuyển đến `/login` và quay lại URL ban đầu sau khi đăng nhập thành công. `/users` chỉ dành cho Admin; `/grades` chỉ dành cho Admin và giảng viên. Tài khoản không đủ quyền được chuyển đến `/forbidden`.

JSON Server cung cấp các collection sau:

| Thao tác | HTTP | Endpoint |
| --- | --- | --- |
| Sinh viên | GET, POST, PUT, DELETE | `/students` |
| Lớp học | GET, POST, PATCH, DELETE | `/classes` |
| Giảng viên | GET, POST, PUT, DELETE | `/teachers` |
| Môn học | GET, POST, PUT, DELETE | `/subjects` |
| Điểm | GET, POST, PUT | `/grades` |
| Người dùng | GET | `/users` |

Điểm tham chiếu sinh viên/môn bằng ID và form kiểm tra khoảng 0–10. Không lưu lặp tên sinh viên hoặc tên môn trong bản ghi điểm.

## 7. Hạn chế và hướng phát triển

- `json-server` chỉ mô phỏng backend; xác thực và phân quyền hiện được xử lý ở phía client.
- Dữ liệu mẫu có thể thay đổi sau thao tác CRUD. Có thể khôi phục bằng cách lấy lại `mock-api/db.json` ban đầu của repository.
- Hướng phát triển: thay bằng backend và cơ sở dữ liệu thực, xác thực/phân quyền phía máy chủ, mã hóa mật khẩu, kiểm tra dữ liệu đầu vào và bổ sung kiểm thử tích hợp.

## Lệnh SSR

Sau khi build, có thể chạy server-side rendering bằng:

```bash
npm run serve:ssr:user-management
```

Server mặc định lắng nghe cổng `4000` (hoặc cổng đặt qua biến môi trường `PORT`).

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
│   │   ├── auth/
│   │   │   ├── facades/
│   │   │   ├── guards/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   └── store/
│   │   ├── interceptors/
│   │   │   ├── client-header.interceptor.ts
│   │   │   ├── error.interceptor.ts
│   │   │   └── loading.interceptor.ts
│   │   └── services/
│   │       ├── loading.service.ts
│   │       └── notification.service.ts
│   ├── features/
│   │   ├── academics/  # Giảng viên, môn học, điểm và AcademicService
│   │   ├── auth/
│   │   ├── classes/    # Danh sách và chi tiết lớp
│   │   ├── dashboard/
│   │   └── students/   # CRUD, danh sách và hồ sơ chi tiết
│   ├── shared/
│   ├── app.config.server.ts
│   ├── app.config.ts
│   ├── app.css
│   ├── app.html
│   ├── app.routes.server.ts
│   ├── app.routes.ts
│   ├── app.spec.ts
│   └── app.ts
├── index.html
├── main.server.ts
├── main.ts
└── server.ts
```


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