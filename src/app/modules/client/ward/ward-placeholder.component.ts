import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-ward-placeholder',
  imports: [CommonModule, RouterLink],
  template: `
    <div id="main-content" class="modern-dashboard ward-placeholder">
      <div class="container-fluid">
        <div class="dashboard-hero">
          <div class="dashboard-hero__copy">
            <span class="dashboard-eyebrow">Ward & Nursing</span>
            <h1>{{ pageTitle }}</h1>
            <p>This module will be built in the next phase. Use the dashboard for ward overview.</p>
          </div>
          <a class="btn btn-default" routerLink="/ward/dashboard">Back to Ward Dashboard</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .ward-placeholder .dashboard-hero {
        align-items: center;
        background: linear-gradient(135deg, #019c9d 0%, #003e86 100%);
        border-radius: 18px;
        color: #fff;
        display: flex;
        gap: 18px;
        justify-content: space-between;
        padding: 24px;
      }
    `,
  ],
})
export class WardPlaceholderComponent {
  private route = inject(ActivatedRoute);
  pageTitle = this.route.snapshot.data['pageTitle'] || 'Ward Module';
}
