import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter, map, startWith } from 'rxjs';
import { LeftmenuComponent } from "../modules/client/leftmenu/leftmenu.component";
import { HeaderComponent } from "../modules/client/header/header.component";

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, LeftmenuComponent, HeaderComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly routerSubscription: Subscription;

  readonly hideShell$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.router.url.startsWith('/pharmacy/pos'))
  );

  constructor() {
    this.syncPosRouteClass(this.router.url);
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncPosRouteClass(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
    document.body.classList.remove('pos-route-active', 'overflow-hidden');
    document.documentElement.classList.remove('pos-route-active');
  }

  private syncPosRouteClass(url: string): void {
    const posRouteActive = url.startsWith('/pharmacy/pos');
    document.documentElement.classList.toggle('pos-route-active', posRouteActive);
    document.body.classList.toggle('pos-route-active', posRouteActive);
    document.body.classList.toggle('overflow-hidden', posRouteActive);
  }
}
