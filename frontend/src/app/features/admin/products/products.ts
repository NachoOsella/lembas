import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Route shell for the admin product catalog section. */
@Component({
  selector: 'app-products',
  imports: [RouterOutlet],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {}
