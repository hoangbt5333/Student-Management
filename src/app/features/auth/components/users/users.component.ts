import { Component } from '@angular/core';

@Component({
  selector: 'app-users',
  standalone: true,
  template: `
    <main>
      <h1>Quản lý người dùng</h1>
      <p>Trang này chỉ dành cho quản trị viên.</p>
    </main>
  `
})
export class UsersComponent {}
