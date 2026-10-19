import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { NotificationService } from './core/services/notification.service';
import { AuthFacade } from './core/auth/facades/auth.facade';



@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
   private loadingService = inject(LoadingService);
   readonly notification = inject(NotificationService);
   readonly authFacade = inject(AuthFacade);

   loading = this.loadingService.loading;
}
