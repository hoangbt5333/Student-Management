import { test, expect } from '@playwright/test';

test.describe('Student Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Đăng nhập với tài khoản Admin
    await page.goto('/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('Admin123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    // Di chuyển tới trang danh sách sinh viên qua link điều hướng SPA (tránh reload SSR)
    await page.getByRole('link', { name: 'Sinh viên', exact: true }).click();
    await expect(page).toHaveURL(/.*students/);
    await expect(page.getByRole('heading', { name: 'Quản lý sinh viên' })).toBeVisible();
  });

  test('Hiển thị danh sách sinh viên với bảng dữ liệu', async ({ page }) => {
    // Đảm bảo bảng sinh viên xuất hiện và có các dòng dữ liệu
    const table = page.locator('table');
    await expect(table).toBeVisible();

    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Tìm kiếm sinh viên theo từ khóa', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Tìm kiếm sinh viên theo mã SV001
    await searchInput.fill('SV001');

    // Chờ kết quả lọc hiển thị mã SV001
    await expect(page.getByText('SV001')).toBeVisible();
  });
});
