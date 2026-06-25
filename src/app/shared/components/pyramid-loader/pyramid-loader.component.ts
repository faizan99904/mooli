import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-pyramid-loader',
  standalone: true,
  templateUrl: './pyramid-loader.component.html',
  styleUrl: './pyramid-loader.component.scss',
})
export class PyramidLoaderComponent {
  readonly loadingService = inject(LoadingService);
}
