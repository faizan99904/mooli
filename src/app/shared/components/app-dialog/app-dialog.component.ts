import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppDialogService } from '../../../core/services/app-dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-dialog.component.html',
  styleUrl: './app-dialog.component.scss',
})
export class AppDialogComponent {
  readonly dialogService = inject(AppDialogService);
  readonly dialog = this.dialogService.dialog;

  close(result: boolean): void {
    this.dialogService.resolve(result);
  }

  dismiss(): void {
    this.dialogService.dismiss();
  }
}
