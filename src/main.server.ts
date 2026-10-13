import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { StudentListComponent } from './app/features/students/components/student-list/student-list';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(StudentListComponent, config, context);

export default bootstrap;
