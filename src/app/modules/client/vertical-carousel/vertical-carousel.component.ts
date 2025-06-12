import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  QueryList,
  ViewChildren,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vertical-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vertical-carousel.component.html',
  styleUrl: './vertical-carousel.component.scss',
})
export class VerticalCarouselComponent implements AfterViewInit {
  @Input({ required: true }) data!: {
    icon: string;
    text: string;
    number: string;
    hoverBg: string;
  }[];

  @ViewChildren('carouselItem') itemsRef!: QueryList<ElementRef>;

  fullData: any[] = [];
  activeIndex = signal(0);
  isTransitioning = true;
  itemHeight = 140;
  hoveredBg: string | null = null;

  ngAfterViewInit(): void {
    this.fullData = [...this.data, this.data[0]];

    setTimeout(() => this.updateItemHeight(), 0);

    setInterval(() => {
      this.activeIndex.set(this.activeIndex() + 1);
      this.isTransitioning = true;
    }, 2000);
  }

  updateItemHeight() {
    const firstItem = this.itemsRef.first?.nativeElement;
    if (firstItem) {
      this.itemHeight = firstItem.offsetHeight;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateItemHeight();
  }

  transform(): string {
    return `translateY(-${this.activeIndex() * this.itemHeight}px)`;
  }

  transition(): string {
    return this.isTransitioning ? 'transform 0.6s ease-in-out' : 'none';
  }

  onTransitionEnd(): void {
    if (this.activeIndex() === this.data.length) {
      this.isTransitioning = false;
      this.activeIndex.set(0);
    }
  }
}
