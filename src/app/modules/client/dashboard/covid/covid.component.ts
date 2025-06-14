import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-covid',
  imports: [RouterLink],
  templateUrl: './covid.component.html',
  styleUrl: './covid.component.scss',
})
export class CovidComponent implements OnInit {
  @ViewChild('dropdownMenu') dropdown!: ElementRef;
  constructor() {}

  ngOnInit(): void {}
  dashboardMenu() {
    document.getElementById('navbarNavDropdown')?.classList.toggle('show');
  }
}
