import { Injectable, signal } from '@angular/core';

export type AppDialogMode = 'alert' | 'confirm';
export type AppDialogTone = 'default' | 'danger';

export interface AppDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: AppDialogTone;
}

export interface AppDialogRequest {
  mode: AppDialogMode;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: AppDialogTone;
}

@Injectable({ providedIn: 'root' })
export class AppDialogService {
  private readonly dialogState = signal<AppDialogRequest | null>(null);
  private resolver: ((result: boolean) => void) | null = null;

  readonly dialog = this.dialogState.asReadonly();

  confirm(options: AppDialogOptions): Promise<boolean> {
    return this.openDialog('confirm', options);
  }

  async alert(options: AppDialogOptions): Promise<void> {
    await this.openDialog('alert', options);
  }

  resolve(result: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.dialogState.set(null);
    resolver?.(result);
  }

  dismiss(): void {
    this.resolve(false);
  }

  private openDialog(mode: AppDialogMode, options: AppDialogOptions): Promise<boolean> {
    if (this.resolver) {
      this.resolve(false);
    }

    this.dialogState.set({
      mode,
      title: options.title || (mode === 'confirm' ? 'Please Confirm' : 'Notice'),
      message: options.message,
      confirmText: options.confirmText || (mode === 'confirm' ? 'Confirm' : 'OK'),
      cancelText: options.cancelText || 'Cancel',
      tone: options.tone || 'default',
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }
}
