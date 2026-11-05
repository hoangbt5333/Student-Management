import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { NotificationService } from './core/services/notification.service';
import { HeaderComponent } from './shared/components/layout/header/header.component';

@Component({
  imports: [RouterOutlet, HeaderComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly loadingService = inject(LoadingService);
  readonly notification = inject(NotificationService);

  readonly loading = this.loadingService.loading;
}
