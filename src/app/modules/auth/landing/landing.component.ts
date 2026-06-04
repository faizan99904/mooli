import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';

type ShowcaseSlide = {
  eyebrow: string;
  title: string;
  summary: string;
  badge: string;
  accent: string;
  metrics: Array<{ label: string; value: string }>;
  features: string[];
};

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnDestroy {
  readonly showcaseSlides: ShowcaseSlide[] = [
    {
      eyebrow: 'Flagship Care',
      title: 'Mooli Hospital Command',
      summary:
        'A refined digital front door for hospital operations, patient care, pharmacy management, and executive visibility.',
      badge: 'Hospital Suite',
      accent: 'teal',
      metrics: [
        { label: 'Care Stations', value: '24/7' },
        { label: 'Departments', value: '18+' },
        { label: 'Visibility', value: 'Live' },
      ],
      features: [
        'Patient, billing, and department workflows',
        'Pharmacy and prescription coordination',
        'Premium role-based hospital operations',
      ],
    },
    {
      eyebrow: 'Commercial Speed',
      title: 'POS That Feels Premium',
      summary:
        'A responsive selling experience for counters, stores, and high-volume teams with keyboard-first momentum.',
      badge: 'POS Experience',
      accent: 'amber',
      metrics: [
        { label: 'Checkout', value: '<10s' },
        { label: 'Controls', value: 'Keyboard' },
        { label: 'Layouts', value: 'Adaptive' },
      ],
      features: [
        'Fast cashier workflows and invoice control',
        'Responsive full-screen selling workspace',
        'Built for stores, pharmacy, and retail counters',
      ],
    },
    {
      eyebrow: 'Project Showcase',
      title: 'Everything Under One Brand',
      summary:
        'Hospital ERP, POS, reporting, payments, roles, and inventory flows presented as one polished platform.',
      badge: 'Unified Platform',
      accent: 'blue',
      metrics: [
        { label: 'Projects', value: 'Multi-app' },
        { label: 'Reports', value: 'Smart' },
        { label: 'Access', value: 'Secure' },
      ],
      features: [
        'Beautiful public-facing product showcase',
        'Hospital and POS onboarding from one entry',
        'Responsive design for desktop, tablet, and mobile',
      ],
    },
  ];

  readonly projectCards = [
    {
      tag: 'Hospital',
      title: 'Clinical Operations',
      description:
        'Appointments, patients, room allotment, departments, and hospital workflows aligned in one elegant control system.',
    },
    {
      tag: 'Pharmacy',
      title: 'Medicine Visibility',
      description:
        'Prescription, pharmacy, and medicine access connected with clean workflows for staff and operators.',
    },
    {
      tag: 'POS',
      title: 'Retail Checkout',
      description:
        'Fast billing, product control, payments, and operator-focused navigation designed for daily throughput.',
    },
    {
      tag: 'Admin',
      title: 'Reporting and Access',
      description:
        'Roles, users, hospitals, financial tracking, and executive oversight wrapped in a polished admin layer.',
    },
  ];

  readonly highlights = [
    'Luxury pre-login presentation for the full Mooli ecosystem',
    'Entry points for hospital teams and POS operators',
    'Responsive sections, carousel motion, and polished visual hierarchy',
    'A stronger first impression before anyone reaches authentication',
  ];

  readonly marquee = [
    'Hospital ERP',
    'Patient Management',
    'Appointments',
    'Pharmacy',
    'Prescription Flow',
    'Commercial POS',
    'Reports',
    'Role Control',
  ];

  activeSlideIndex = 0;

  private readonly slideTimer = window.setInterval(() => {
    this.activeSlideIndex = (this.activeSlideIndex + 1) % this.showcaseSlides.length;
  }, 4200);

  get activeSlide(): ShowcaseSlide {
    return this.showcaseSlides[this.activeSlideIndex];
  }

  nextSlide(): void {
    this.activeSlideIndex = (this.activeSlideIndex + 1) % this.showcaseSlides.length;
  }

  previousSlide(): void {
    this.activeSlideIndex =
      (this.activeSlideIndex - 1 + this.showcaseSlides.length) % this.showcaseSlides.length;
  }

  jumpToSlide(index: number): void {
    this.activeSlideIndex = index;
  }

  ngOnDestroy(): void {
    window.clearInterval(this.slideTimer);
  }
}
