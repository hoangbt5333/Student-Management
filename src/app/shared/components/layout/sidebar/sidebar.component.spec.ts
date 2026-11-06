import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SidebarComponent } from './sidebar.component';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mockCan: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockCan = vi.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            can: mockCan
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create the sidebar component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the brand title and subtitle', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.brand-title')?.textContent).toContain('UniManage');
    expect(el.querySelector('.brand-subtitle')?.textContent).toContain('STUDENT MANAGEMENT');
  });

  it('should render all navigation links when user has all permissions', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('.nav-items a')).map(a => a.textContent?.trim());

    expect(links).toContain('Dashboard');
    expect(links).toContain('Sinh viên');
    expect(links).toContain('Lớp học');
    expect(links).toContain('Giảng viên');
    expect(links).toContain('Môn học');
    expect(links).toContain('Điểm số');
    expect(links).toContain('Người dùng');
  });

  it('should hide restricted links when permissions are lacking', () => {
    mockCan.mockReturnValue(false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('.nav-items a')).map(a => a.textContent?.trim());

    expect(links).toContain('Dashboard');
    expect(links).not.toContain('Sinh viên');
    expect(links).not.toContain('Lớp học');
    expect(links).not.toContain('Giảng viên');
    expect(links).not.toContain('Môn học');
    expect(links).not.toContain('Điểm số');
    expect(links).not.toContain('Người dùng');
  });

  it('should render sidebar footer with help and academic year info', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.help-item')?.textContent).toContain('Trợ giúp & Hỗ trợ');
    expect(el.querySelector('.env-year')?.textContent).toContain('Năm học 2026–2027');
  });
});
