import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { StudentListComponent } from './app/pages/student-list/student-list';

bootstrapApplication(StudentListComponent, appConfig)
  .catch((err) => console.error(err));
