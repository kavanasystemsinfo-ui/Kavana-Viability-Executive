import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg:svg
      [attr.width]="width"
      [attr.height]="height"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      class="sparkline"
    >
      <svg:path
        [attr.d]="path"
        [attr.stroke]="color"
        [attr.stroke-width]="strokeWidth"
        fill="none"
      />
    </svg:svg>
  `,
  styles: [
    `
      .sparkline {
        display: block;
      }
    `,
  ],
})
export class SparklineComponent {
  @Input() data: number[] = [];
  @Input() width: number = 100;
  @Input() height: number = 30;
  @Input() color: string = 'var(--ai)';
  @Input() strokeWidth: number = 2;

  get path(): string {
    if (this.data.length < 2) {
      return '';
    }

    const padding = 4;
    const usableWidth = this.width - 2 * padding;
    const usableHeight = this.height - 2 * padding;

    // Normalize data to 0-1 range
    const minVal = Math.min(...this.data);
    const maxVal = Math.max(...this.data);
    const range = maxVal - minVal;

    if (range === 0) {
      // All values are the same
      const normalized = this.data.map(() => 0.5);
      return this.generatePath(normalized, usableWidth, usableHeight, padding);
    }

    const normalized = this.data.map((val) => (val - minVal) / range);
    return this.generatePath(normalized, usableWidth, usableHeight, padding);
  }

  private generatePath(
    normalized: number[],
    width: number,
    height: number,
    padding: number,
  ): string {
    if (normalized.length === 0) {
      return '';
    }

    const points = normalized.map((val, index) => {
      const x = padding + (index / (normalized.length - 1)) * width;
      const y = padding + height - val * height; // Invert Y for SVG (0 is top)
      return `${x},${y}`;
    });

    return `M${points.join(' L')}`;
  }
}
