import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Hiển thị đầy đủ form đăng nhập', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Student Management', exact: true })).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });

  test('Báo lỗi validation khi gửi form rỗng', async ({ page }) => {
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page.getByText('Vui lòng nhập tên đăng nhập.')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập mật khẩu.')).toBeVisible();
  });

  test('Hiển thị thông báo khi sai thông tin đăng nhập', async ({ page }) => {
    await page.locator('#username').fill('wronguser');
    await page.locator('#password').fill('WrongPassword123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('.error-banner')).toContainText('Tên đăng nhập hoặc mật khẩu không chính xác');
  });

  test('Đăng nhập thành công và chuyển hướng tới Dashboard', async ({ page }) => {
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('Admin123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard quản lý sinh viên' })).toBeVisible();
  });
});
