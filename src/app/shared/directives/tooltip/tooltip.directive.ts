import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
  inject,
  input
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly tooltip = input<string>('', { alias: 'appTooltip' });
  readonly position = input<TooltipPosition>('top', { alias: 'tooltipPosition' });
  readonly disabled = input<boolean>(false, { alias: 'tooltipDisabled' });

  private tooltipElement: HTMLElement | null = null;
  private tooltipId: string | null = null;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.show();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hide();
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.show();
  }

  @HostListener('focusout')
  onFocusOut(): void {
    this.hide();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.tooltipElement) {
      this.updatePosition();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.tooltipElement) {
      this.updatePosition();
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }

  show(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.disabled()) return;

    const text = this.tooltip()?.trim();
    if (!text) return;

    if (this.tooltipElement) {
      this.updatePosition();
      return;
    }

    this.tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`;

    // Create tooltip wrapper
    this.tooltipElement = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipElement, 'app-tooltip');
    this.renderer.setAttribute(this.tooltipElement, 'id', this.tooltipId);
    this.renderer.setAttribute(this.tooltipElement, 'role', 'tooltip');
    this.renderer.setAttribute(this.tooltipElement, 'data-position', this.position());

    // Create text node
    const textNode = this.renderer.createText(text);
    this.renderer.appendChild(this.tooltipElement, textNode);

    // Create arrow
    const arrow = this.renderer.createElement('span');
    this.renderer.addClass(arrow, 'app-tooltip-arrow');
    this.renderer.appendChild(this.tooltipElement, arrow);

    // Append to document body to prevent clipping by overflow:hidden containers
    this.renderer.appendChild(this.document.body, this.tooltipElement);
    this.renderer.setAttribute(this.el.nativeElement, 'aria-describedby', this.tooltipId);

    this.updatePosition();

    // Fade-in via class
    this.renderer.addClass(this.tooltipElement, 'app-tooltip-visible');
  }

  hide(): void {
    if (!this.tooltipElement) return;

    if (this.tooltipId) {
      this.renderer.removeAttribute(this.el.nativeElement, 'aria-describedby');
      this.tooltipId = null;
    }

    if (this.tooltipElement.parentNode) {
      this.renderer.removeChild(this.document.body, this.tooltipElement);
    }
    this.tooltipElement = null;
  }

  private updatePosition(): void {
    if (!this.tooltipElement) return;

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const gap = 8;
    const pos = this.position();

    let top = 0;
    let left = 0;

    switch (pos) {
      case 'top':
        top = hostRect.top - tooltipRect.height - gap;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = hostRect.bottom + gap;
        left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
        left = hostRect.right + gap;
        break;
    }

    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

    const maxLeft = windowWidth - tooltipRect.width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    const maxTop = windowHeight - tooltipRect.height - 8;
    top = Math.max(8, Math.min(top, maxTop));

    this.renderer.setStyle(this.tooltipElement, 'top', `${Math.round(top)}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${Math.round(left)}px`);
  }
}
