import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-contacts',
  imports: [CommonModule],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent {
  AllContactsTab: boolean = true;
  GoogleContactsTab!: boolean;
  InvitationsContactsTab!: boolean;
  constructor() { }

  onTab(number:any) {
    this.AllContactsTab = false;
    this.GoogleContactsTab = false;
    this.InvitationsContactsTab = false;

    if (number == '1') {
      this.AllContactsTab = true;
    }
    else if (number == '2') {
      this.GoogleContactsTab = true;
    }
    else if (number == '3') {
      this.InvitationsContactsTab = true;
    }
  }
  ngOnInit(): void {
  }
}
