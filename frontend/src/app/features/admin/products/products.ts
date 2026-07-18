import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Route shell for the admin product catalog section. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-products',
  imports: [RouterOutlet],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {}
