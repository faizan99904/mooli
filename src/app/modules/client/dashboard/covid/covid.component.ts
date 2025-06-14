import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-covid',
  imports: [RouterLink],
  templateUrl: './covid.component.html',
  styleUrl: './covid.component.scss',
})
export class CovidComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
  dashboardMenu() {
    document.getElementById('navbarNavDropdown')?.classList.toggle('show');
  }
}
