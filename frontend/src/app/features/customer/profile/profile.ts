import { Component } from '@angular/core';

import { AppButton } from '../../../shared/components/app-button/app-button';

/** Presents the current account area while profile editing is not yet available. */
@Component({
  selector: 'app-profile',
  imports: [AppButton],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {}
