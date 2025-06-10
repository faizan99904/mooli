import { Component } from '@angular/core';

@Component({
  selector: 'app-worldmap',
  standalone:true,
  imports: [],
  templateUrl: './worldmap.component.html',
  styleUrl: './worldmap.component.scss'
})
export class WorldmapComponent {
  zoom: number = 8;
  lat: number = 51.673858;
  long: number = 7.815982;
  constructor() { }

  ngOnInit(): void {
  }
}
