import { Component, OnInit } from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';

@Component({
  selector: 'app-worldmap',
  standalone: true,
  imports: [GoogleMapsModule],
  templateUrl: './worldmap.component.html',
  styleUrls: ['./worldmap.component.scss']
})
export class WorldmapComponent implements OnInit {
  zoom = 8;
  lat = 51.673858;
  long = 7.815982;

  constructor() { }

  ngOnInit(): void { }
}
