import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LeftmenuComponent } from "../modules/client/leftmenu/leftmenu.component";
import { HeaderComponent } from "../modules/client/header/header.component";

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, LeftmenuComponent, HeaderComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {

}
