import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFoundComponent {}
