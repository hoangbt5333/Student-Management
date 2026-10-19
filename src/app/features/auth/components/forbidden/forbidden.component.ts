
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="forbidden-page">
      <h1>403 - Không có quyền truy cập</h1>

      <p>
        Tài khoản của bạn không có quyền truy cập trang này.
      </p>

      <a routerLink="/">Quay về trang chủ</a>
    </main>
  `,
  styles: [`
    .forbidden-page {
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }

    h1 {
      color: #dc2626;
    }

    a {
      color: #2563eb;
      margin-top: 12px;
    }
  `]
})
export class ForbiddenComponent {}
