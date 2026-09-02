import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg:svg [attr.width]="width" [attr.height]="height" [attr.viewBox]="'0 0 ' + width + ' ' + height" class="progress-bar">
      <svg:rect x="0" y="0" [attr.width]="width" [attr.height]="height" fill="var(--bg)" />
      <svg:rect x="0" y="0" [attr.width]="calculatedWidth" [attr.height]="height" [attr.fill]="color" />
    </svg:svg>
  `,
  styles: [`
    .progress-bar {
      display: block;
    }
  `]
})
export class ProgressBarComponent {
  @Input() value: number = 0;
  @Input() max: number = 100;
  @Input() color: string = 'var(--ai)';
  @Input() width: number = 100;
  @Input() height: number = 10;

  get calculatedWidth(): number {
    const percentage = Math.min(Math.max(this.value / this.max, 0), 1);
    return this.width * percentage;
  }
}