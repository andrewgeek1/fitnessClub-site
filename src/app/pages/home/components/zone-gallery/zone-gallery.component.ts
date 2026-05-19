import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { ZONE_GALLERY_IMAGES } from '../../../../core/data/site-data';

@Component({
  selector: 'app-zone-gallery',
  templateUrl: './zone-gallery.component.html',
  styleUrl: './zone-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoneGalleryComponent {
  @ViewChild('stage', { static: true }) private readonly stageRef!: ElementRef<HTMLElement>;

  readonly slides = ZONE_GALLERY_IMAGES;
  readonly currentIndex = signal(0);
  readonly isHover = signal(false);
  readonly cursorLeft = signal(0);
  readonly cursorTop = signal(0);
  readonly cursorLabel = signal('→');

  private pointerSide: 'left' | 'right' = 'right';

  previousIndex(): number {
    return this.normalize(this.currentIndex() - 1);
  }

  nextIndex(): number {
    return this.normalize(this.currentIndex() + 1);
  }

  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }

    this.isHover.set(true);
    this.updateCursor(event);
  }

  onPointerLeave(): void {
    this.isHover.set(false);
  }

  onPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }

    this.isHover.set(true);
    this.updateCursor(event);
  }

  onClick(event: MouseEvent): void {
    this.resolveSide(event);
    this.go(this.pointerSide === 'left' ? -1 : 1);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.go(-1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.go(1);
    }
  }

  private go(direction: number): void {
    this.currentIndex.set(this.normalize(this.currentIndex() + direction));
  }

  private normalize(value: number): number {
    return (value + this.slides.length) % this.slides.length;
  }

  private updateCursor(event: PointerEvent): void {
    const rect = this.stageRef.nativeElement.getBoundingClientRect();
    const localX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);

    this.pointerSide = localX < rect.width / 2 ? 'left' : 'right';
    this.cursorLeft.set(localX);
    this.cursorTop.set(localY);
    this.cursorLabel.set(this.pointerSide === 'left' ? '←' : '→');
  }

  private resolveSide(event: MouseEvent): void {
    const rect = this.stageRef.nativeElement.getBoundingClientRect();
    const localX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    this.pointerSide = localX < rect.width / 2 ? 'left' : 'right';
  }
}
