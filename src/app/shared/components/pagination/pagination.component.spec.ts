import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
  });

  it('should create the pagination component', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalItems', 100);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should calculate totalPages and render summary text correctly', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalItems', 128);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('itemLabel', 'tài khoản');
    fixture.detectChanges();

    expect(component.totalPages()).toBe(13);
    expect(component.startItem()).toBe(1);
    expect(component.endItem()).toBe(10);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Hiển thị');
    expect(el.textContent).toContain('1–10');
    expect(el.textContent).toContain('128');
    expect(el.textContent).toContain('tài khoản');
  });

  it('should generate all page numbers when totalPages <= 7', () => {
    fixture.componentRef.setInput('currentPage', 2);
    fixture.componentRef.setInput('totalItems', 25);
    fixture.componentRef.setInput('pageSize', 5);
    fixture.detectChanges();

    expect(component.totalPages()).toBe(5);
    expect(component.pages()).toEqual([1, 2, 3, 4, 5]);

    const pageButtons = fixture.nativeElement.querySelectorAll('.page-num-btn');
    expect(pageButtons.length).toBe(5);
    expect(pageButtons[1].classList.contains('active')).toBe(true);
  });

  it('should generate ellipsis when totalPages > 7', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalItems', 160);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.detectChanges();

    expect(component.totalPages()).toBe(16);
    expect(component.pages()).toEqual([1, 2, 3, 4, 5, '…', 16]);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.page-ellipsis')?.textContent).toBe('…');
  });

  it('should emit pageChange when clicking a page number', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.detectChanges();

    const spy = vi.fn();
    component.pageChange.subscribe(spy);

    const pageButtons = fixture.nativeElement.querySelectorAll('.page-num-btn') as NodeListOf<HTMLButtonElement>;
    pageButtons[2].click(); // click page 3

    expect(spy).toHaveBeenCalledWith(3);
  });

  it('should disable prev button on page 1 and enable it on page > 1', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.detectChanges();

    const prevBtn = fixture.nativeElement.querySelector('.btn-prev') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);

    fixture.componentRef.setInput('currentPage', 2);
    fixture.detectChanges();
    expect(prevBtn.disabled).toBe(false);

    const spy = vi.fn();
    component.pageChange.subscribe(spy);
    prevBtn.click();
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('should disable next button on last page and enable it on earlier pages', () => {
    fixture.componentRef.setInput('currentPage', 5);
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.detectChanges();

    const nextBtn = fixture.nativeElement.querySelector('.btn-next') as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);

    fixture.componentRef.setInput('currentPage', 4);
    fixture.detectChanges();
    expect(nextBtn.disabled).toBe(false);

    const spy = vi.fn();
    component.pageChange.subscribe(spy);
    nextBtn.click();
    expect(spy).toHaveBeenCalledWith(5);
  });

  it('should emit pageSizeChange when changing page size select', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.detectChanges();

    const spy = vi.fn();
    component.pageSizeChange.subscribe(spy);

    const select = fixture.nativeElement.querySelector('.page-size-select') as HTMLSelectElement;
    select.value = '20';
    select.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith(20);
  });

  it('should hide page size select when showPageSize is false', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('showPageSize', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.page-size-select')).toBeNull();
  });
});
