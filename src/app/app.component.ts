import { Component, OnInit, inject } from '@angular/core';
import {
  Router,
  RouterOutlet,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'Mooli'; // Removed duplicate title
  greenClass = true;
  orageClass = false;
  blushClass = false;
  cyanClass = false;
  timberClass = false;
  blueClass = false;
  amethystClass = false;

  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private titleService = inject(Title);

  ngOnInit(): void {
    sessionStorage.setItem('Sidebar', 'light_active');
    sessionStorage.setItem('GradientColor', 'gradient');

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe(() => {
        const rt = this.getChild(this.activatedRoute);
        rt.data.subscribe((data: any) => {
          if (data && data.title) {
            this.titleService.setTitle(data.title);
          }
        });
      });

    setTimeout(() => {
      document.querySelector('.page-loader-wrapper')?.classList.add('HideDiv');
    }, 1000);
  }

  private getChild(activatedRoute: ActivatedRoute): ActivatedRoute {
    return activatedRoute.firstChild
      ? this.getChild(activatedRoute.firstChild)
      : activatedRoute;
  }

  toggleThemeSetting(): void {
    document.querySelector('.themesetting')?.classList.toggle('open');
  }

  ToggleLight(e: Event): void {
    const target = e.target as HTMLInputElement;
    const className = document.getElementById('left-sidebar');
    if (target.checked) {
      sessionStorage.setItem('Sidebar', 'light_active');
      className?.classList.add('light_active');
    } else {
      sessionStorage.setItem('Sidebar', '');
      className?.classList.remove('light_active');
    }
  }

  ToggleGradient(e: Event): void {
    const target = e.target as HTMLInputElement;
    const classElements = document.querySelectorAll('.theme-bg');

    classElements.forEach((element) => {
      if (target.checked) {
        element.classList.add('gradient');
        sessionStorage.setItem('GradientColor', 'gradient');
      } else {
        element.classList.remove('gradient');
        sessionStorage.setItem('GradientColor', '');
      }
    });
  }

  ToggleDarkMode(e: Event): void {
    const target = e.target as HTMLInputElement;
    const className = document.getElementById('MooliHtml');
    className?.setAttribute('data-theme', target.checked ? 'dark' : 'light');
  }

  ToggleRTL(e: Event): void {
    const target = e.target as HTMLInputElement;
    document.body.classList.toggle('rtl_active', target.checked);
  }

  themeColor(color: string): void {
    // Reset all classes
    this.greenClass = false;
    this.orageClass = false;
    this.blushClass = false;
    this.cyanClass = false;
    this.timberClass = false;
    this.blueClass = false;
    this.amethystClass = false;

    const className = document.getElementById('body');
    className?.removeAttribute('class');

    switch (color) {
      case 'g':
        this.greenClass = true;
        className?.classList.add('theme-green');
        break;
      case 'o':
        this.orageClass = true;
        className?.classList.add('theme-orange');
        break;
      case 'b':
        this.blushClass = true;
        className?.classList.add('theme-blush');
        break;
      case 'c':
        this.cyanClass = true;
        className?.classList.add('theme-cyan');
        break;
      case 't':
        this.timberClass = true;
        className?.classList.add('theme-timber');
        break;
      case 'bl':
        this.blueClass = true;
        className?.classList.add('theme-blue');
        break;
      case 'a':
        this.amethystClass = true;
        className?.classList.add('theme-amethyst');
        break;
    }
  }

  closeMenu(): void {
    document.getElementById('rightbar')?.classList.remove('open');
    document.querySelector('.sticky-note')?.classList.remove('open');
    document.querySelector('.overlay')?.classList.remove('open');
    document.body.classList.remove('offcanvas-active');
  }
}
