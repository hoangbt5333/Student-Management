import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { StudentList } from './app/pages/student-list/student-list';

bootstrapApplication(StudentList, appConfig)
  .catch((err) => console.error(err));
