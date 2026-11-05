import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HeaderComponent } from './header.component';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { AuthUser } from '../../../../core/auth/models/auth.model';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let mockCurrentUser: ReturnType<typeof signal<AuthUser | null>>;
  let mockCan: ReturnType<typeof vi.fn>;
  let mockLogout: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockCurrentUser = signal<AuthUser | null>({
      id: 'USR001',
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'admin'
    });
    mockCan = vi.fn().mockReturnValue(true);
    mockLogout = vi.fn();

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            currentUser: mockCurrentUser,
            can: mockCan,
            logout: mockLogout
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create the header component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the application title', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Student Management System');
  });

  it('should render all navigation links when user has all permissions', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('nav a')).map(a => a.textContent?.trim());
    expect(links).toContain('Dashboard');
    expect(links).toContain('Sinh viên');
    expect(links).toContain('Lớp học');
    expect(links).toContain('Giảng viên');
    expect(links).toContain('Môn học');
    expect(links).toContain('Điểm số');
    expect(links).toContain('Người dùng');
  });

  it('should hide restricted navigation links when permissions are lacking', () => {
    mockCan.mockReturnValue(false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('nav a')).map(a => a.textContent?.trim());
    expect(links).toContain('Dashboard');
    expect(links).not.toContain('Sinh viên');
    expect(links).not.toContain('Lớp học');
    expect(links).not.toContain('Giảng viên');
    expect(links).not.toContain('Môn học');
    expect(links).not.toContain('Điểm số');
    expect(links).not.toContain('Người dùng');
  });

  it('should render user displayName and logout button when authenticated', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const userSpan = el.querySelector('.nav-auth span');
    const logoutBtn = el.querySelector('.nav-auth button');

    expect(userSpan?.textContent).toContain('Quản trị viên');
    expect(logoutBtn?.textContent).toContain('Đăng xuất');
  });

  it('should call authFacade.logout() when clicking the logout button', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const logoutBtn = el.querySelector('.nav-auth button') as HTMLButtonElement;
    logoutBtn.click();

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should render login link when user is not authenticated', () => {
    mockCurrentUser.set(null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const loginLink = el.querySelector('.nav-auth a');
    expect(loginLink?.textContent?.trim()).toBe('Đăng nhập');
  });
});
