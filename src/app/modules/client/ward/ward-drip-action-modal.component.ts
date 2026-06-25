import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ward-drip-action-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './ward-drip-action-modal.component.html',
  styleUrl: './ward-drip-action-modal.component.scss',
})
export class WardDripActionModalComponent {
  @Input() open = false;
  @Input() action: 'stop' | 'complete' = 'stop';
  @Input() patientName = '';
  @Input() fluidName = '';
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<string>();

  reason = '';

  get title(): string {
    return this.action === 'stop' ? 'Stop Drip' : 'Complete Drip';
  }

  get description(): string {
    return this.action === 'stop'
      ? 'Drip will return to Planned status. You may add an optional reason.'
      : 'Drip will be marked as Completed. You may add an optional note.';
  }

  get reasonLabel(): string {
    return this.action === 'stop' ? 'Stop Reason (optional)' : 'Completion Note (optional)';
  }

  get confirmLabel(): string {
    return this.action === 'stop' ? 'Stop Drip' : 'Complete Drip';
  }

  close(): void {
    this.reason = '';
    this.closed.emit();
  }

  confirm(): void {
    this.confirmed.emit(this.reason.trim());
    this.reason = '';
  }
}
