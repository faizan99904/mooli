import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';

@Component({
  selector: 'app-all-doctors',
  imports: [RouterLink],
  templateUrl: './all-doctors.component.html',
  styleUrl: './all-doctors.component.scss'
})
export class AllDoctorsComponent {

}
