import { Injectable, NgZone, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly zone = inject(NgZone);
  private activeRequests = 0;
  private showStartedAt = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly minDurationMs = 1000;

  private readonly loadingState = signal(false);
  readonly loading = this.loadingState.asReadonly();

  show(): void {
    this.activeRequests += 1;

    if (this.activeRequests !== 1) {
      return;
    }

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.showStartedAt = Date.now();
    this.zone.run(() => this.loadingState.set(true));
  }

  hide(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (this.activeRequests > 0) {
      return;
    }

    const elapsed = Date.now() - this.showStartedAt;
    const remaining = Math.max(0, this.minDurationMs - elapsed);

    this.hideTimer = setTimeout(() => {
      this.zone.run(() => {
        this.hideTimer = null;
        if (this.activeRequests === 0) {
          this.loadingState.set(false);
        }
      });
    }, remaining);
  }
}
