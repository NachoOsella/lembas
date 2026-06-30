import { Component } from '@angular/core';

import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { PosProductSearchComponent } from './components/pos-product-search/pos-product-search';

/**
 * POS landing page (S3-US09).
 *
 * <p>Hosts the product search bar; the cart, summary and payment flow land
 * here in S3-US10 (LEMBAS-54) and S3-US11 (LEMBAS-55).</p>
 */
@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [AppPageHeader, PosProductSearchComponent],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class Pos {}
