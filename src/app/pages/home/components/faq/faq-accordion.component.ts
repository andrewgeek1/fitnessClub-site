import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { FAQ_ITEMS } from '../../../../core/data/site-data';

@Component({
  selector: 'app-faq-accordion',
  templateUrl: './faq-accordion.component.html',
  styleUrl: './faq-accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FaqAccordionComponent {
  readonly items = FAQ_ITEMS;
  readonly openIndex = signal(0);

  open(index: number): void {
    this.openIndex.set(this.openIndex() === index ? -1 : index);
  }

  panelStyle(index: number): string {
    return this.openIndex() === index ? '400px' : '0px';
  }

  @HostListener('window:resize')
  handleResize(): void {
    this.openIndex.update((value) => value);
  }
}
