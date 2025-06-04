import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  isFull!: boolean;
  isFull1!: any;
  isFull3!: boolean;
  isFull4!: boolean;
  constructor(private router: Router) { }

  ngOnInit(): void {

  }
  closeMenu() {
    const body = document.getElementsByTagName('body')[0].classList.remove("offcanvas-active");
  }

  dashboardMenu() {
    document.getElementById('navbarNavDropdown')?.classList.toggle("show");
  }

  fullScreenSection(number:any) {
    if (number == 1) {
      if (this.isFull) {
        this.isFull = false;
      }
      else {
        this.isFull = true;
      }
    }
    else if (number == 2) {
      if (this.isFull1) {
        this.isFull1 = false;
      }
      else {
        this.isFull1 = true;
      }
    }
    else if (number == 3) {
      if (this.isFull3) {
        this.isFull3 = false;
      }
      else {
        this.isFull3 = true;
      }
    }
    else if (number == 4) {
      if (this.isFull4) {
        this.isFull4 = false;
      }
      else {
        this.isFull4 = true;
      }
    }

  }
}
