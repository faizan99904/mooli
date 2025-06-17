import { Component, inject, AfterViewInit, OnInit } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { AppComponent } from '../../../app.component';
import { trigger, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-leftmenu',
  animations: [
    trigger('collapseExpand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './leftmenu.component.html',
  styleUrl: './leftmenu.component.scss',
})
export class LeftmenuComponent implements OnInit, AfterViewInit {
  isCollapsed = true;
  Pagecollapse = true;
  PaymentCollapsed = true;
  RoomCollapsed = true;
  PatientCollapsed = true;
  private router = inject(Router);
  private app = inject(AppComponent);
  role = localStorage.getItem('role');

  constructor() {
    this.initializeCollapsedStates();
  }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.closeSidebarOnMobile();
      }
    });
  }

  ngAfterViewInit() {
    this.applyThemeAndStyles();
  }

  private initializeCollapsedStates(): void {
    const url = this.router.url;
    this.isCollapsed = !url.includes('doctors');
    this.Pagecollapse = !url.includes('pages');
    this.PaymentCollapsed = !url.includes('payments');
    this.RoomCollapsed = !url.includes('room-allotment');
    this.PatientCollapsed = !url.includes('patients');
  }

  private applyThemeAndStyles(): void {
    setTimeout(() => {
      this.setThemeColor();
      this.applySidebarClass();
      this.applyGradientClasses();
    });
  }

  private setThemeColor(): void {
    const url = this.router.url;
    if (url.includes('cryptocurrency')) {
      this.app.themeColor('o');
    } else if (url.includes('campaign')) {
      this.app.themeColor('b');
    } else if (url.includes('ecommerce')) {
      this.app.themeColor('a');
    } else {
      this.app.themeColor('g');
    }
  }

  private applySidebarClass(): void {
    const sidebar = document.getElementById('left-sidebar');
    const sidebarPref = sessionStorage.getItem('Sidebar');

    if (sidebarPref) {
      sidebar?.classList.add(sidebarPref);
    } else {
      sidebar?.classList.remove('light_active');
    }
  }

  private applyGradientClasses(): void {
    const colorElements = document.getElementsByClassName('theme-bg');
    const gradientPref = sessionStorage.getItem('GradientColor');

    Array.from(colorElements).forEach((element) => {
      if (gradientPref) {
        element.classList.add('gradient');
      } else {
        element.classList.remove('gradient');
      }
    });
  }

  showDropDown(): void {
    document.getElementById('drp')?.classList.toggle('ShowDiv');
  }

  toggleMenu(): void {
    document.body.classList.toggle('toggle_menu_active');
  }

  cToggoleMenu(): void {
    document.body.classList.remove('offcanvas-active');
    document.querySelector('.overlay')?.classList.toggle('open');
  }

  private closeSidebarOnMobile(): void {
    const width = window.innerWidth;
    if (width < 768) {
      document.body.classList.remove('offcanvas-active');
      const getCalss = document.querySelector('.offcanvas-active');
      if (document.body.contains(getCalss)) {
        document.querySelector('.overlay')?.classList.toggle('open');
      }
    }
  }
}
