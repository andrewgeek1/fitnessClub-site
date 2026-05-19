import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';
import { HERO_SLIDES } from '../../../../core/data/site-data';

declare const Swiper: undefined | (new (element: HTMLElement, options: object) => { destroy(): void });

@Component({
  selector: 'app-home-hero',
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeHeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('slider', { static: true }) private readonly sliderRef!: ElementRef<HTMLElement>;
  @ViewChild('pagination', { static: true }) private readonly paginationRef!: ElementRef<HTMLElement>;

  readonly slides = HERO_SLIDES;
  readonly activeSlide = signal(this.slides[0]);

  private swiperInstance: { destroy(): void } | null = null;

  ngAfterViewInit(): void {
    if (typeof Swiper === 'undefined') {
      return;
    }

    const syncSlide = (index: number) => {
      const normalizedIndex = ((index % this.slides.length) + this.slides.length) % this.slides.length;
      this.activeSlide.set(this.slides[normalizedIndex]);
    };

    this.swiperInstance = new Swiper(this.sliderRef.nativeElement, {
      loop: true,
      speed: 1200,
      autoplay: {
        delay: 10000,
        disableOnInteraction: false
      },
      pagination: {
        el: this.paginationRef.nativeElement,
        clickable: true
      },
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
      on: {
        init: (swiper: { realIndex?: number; activeIndex?: number }) => {
          syncSlide(swiper.realIndex ?? swiper.activeIndex ?? 0);
        },
        slideChangeTransitionStart: (swiper: { realIndex?: number; activeIndex?: number }) => {
          syncSlide(swiper.realIndex ?? swiper.activeIndex ?? 0);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.swiperInstance?.destroy();
  }
}
