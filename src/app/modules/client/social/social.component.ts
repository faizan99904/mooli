import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { VerticalCarouselComponent } from "../vertical-carousel/vertical-carousel.component";

@Component({
  selector: 'app-social',
  imports: [CommonModule, VerticalCarouselComponent],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss'
})
export class SocialComponent {
  FeedTab: boolean = true;
  ActivityTab!: boolean;
  FriendsTab!: boolean;
  constructor() { }

  onTab(number:any) {
    this.FeedTab = false;
    this.ActivityTab = false;
    this.FriendsTab = false;

    if (number == '1') {
      this.FeedTab = true;
    }
    else if (number == '2') {
      this.ActivityTab = true;
    }
    else if (number == '3') {
      this.FriendsTab = true;
    }
  }
  ngOnInit(): void {
  }
}
