import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  isFullScreen!: boolean;
  contactTab!: boolean;
  groupTab!: boolean;
  chatTab: boolean = true;
  constructor(private router: Router) {}

  ngOnInit(): void {
    // setTimeout(() => {
    //   document.getElementsByClassName('page-loader-wrapper')[0].classList.add("HideDiv");
    // }, 1000);
  }
  mToggoleMenu() {
    document
      .getElementsByTagName('body')[0]
      .classList.toggle('offcanvas-active');
    document.getElementsByClassName('overlay')[0].classList.toggle('open');
  }
  noteToggle() {
    document.getElementsByClassName('sticky-note')[0].classList.toggle('open');
    document.getElementsByClassName('overlay')[0].classList.toggle('open');
  }
  openRightMenu() {
    document.getElementById('rightbar')?.classList.toggle('open');
    document.getElementsByClassName('overlay')[0].classList.toggle('open');
  }
  openfullScreen() {
    let elem = document.documentElement;
    let methodToBeInvoked =
      elem.requestFullscreen ||
      elem.requestFullscreen ||
      (elem as any['mozRequestFullscreen']) ||
      (elem as any['msRequestFullscreen']);
    if (methodToBeInvoked) {
      methodToBeInvoked.call(elem);
    }
    this.isFullScreen = true;
  }

  closeFullScreen() {
    const docWithBrowsersExitFunctions = document as Document & {
      mozCancelFullScreen(): Promise<void>;
      webkitExitFullscreen(): Promise<void>;
      msExitFullscreen(): Promise<void>;
    };
    if (docWithBrowsersExitFunctions.exitFullscreen) {
      docWithBrowsersExitFunctions.exitFullscreen();
    } else if (docWithBrowsersExitFunctions.mozCancelFullScreen) {
      /* Firefox */
      docWithBrowsersExitFunctions.mozCancelFullScreen();
    } else if (docWithBrowsersExitFunctions.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      docWithBrowsersExitFunctions.webkitExitFullscreen();
    } else if (docWithBrowsersExitFunctions.msExitFullscreen) {
      /* IE/Edge */
      docWithBrowsersExitFunctions.msExitFullscreen();
    }
    this.isFullScreen = false;
  }

  onTab(number: any) {
    this.chatTab = false;
    this.groupTab = false;
    this.contactTab = false;
    if (number == '1') {
      this.chatTab = true;
    } else if (number == '2') {
      this.groupTab = true;
    } else if (number == '3') {
      this.contactTab = true;
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigateByUrl('/login');
  }
}
