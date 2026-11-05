import { Component, inject, OnInit, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClassFacade } from '../../facades/class.facade';
import type { ClassModel } from '../../models/class.model';
import { ClassForm } from '../class-form/class-form';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StudentFacade } from '../../../students/facades/student.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';

@Component({
  imports: [ClassForm, RouterLink, ModalComponent],
  selector: 'app-class-list',
  styleUrl: './class-list.css',
  templateUrl: './class-list.html',
})
export class ClassList implements OnInit {
  readonly facade = inject(ClassFacade);
  readonly studentFacade = inject(StudentFacade);
  readonly authFacade = inject(AuthFacade);

  readonly showForm = signal(false);
  readonly editingClass = signal<ClassModel | null>(null);

  private waitingForSave = false;
  private readonly saveEffect = effect(() => {
    const success = this.facade.successMessage();

    if (!this.waitingForSave) {
      return;
    }

    if (success) {
      this.waitingForSave = false;
      this.closeForm();
      return;
    }

    this.waitingForSave = false;
  });

  ngOnInit(): void {
    this.facade.loadClasses();
    this.studentFacade.loadStudents();
  }

  openAddForm(): void {
    this.editingClass.set(null);
    this.showForm.set(true);
    this.facade.clearMessages();
  }

  openEditForm(classItem: ClassModel): void {
    this.editingClass.set({ ...classItem });
    this.showForm.set(true);
    this.facade.clearMessages();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingClass.set(null);
  }

  onSave(event: {
    classItem: ClassModel;
    mode: 'add' | 'update';
  }): void {
    this.waitingForSave = true;
    this.facade.saveClass(event.classItem, event.mode);
  }

  onDelete(classItem: ClassModel): void {
    const students = this.studentFacade.students();

    const hasStudents = students.some(student =>
      student.classId
        ? student.classId === classItem.id
        : student.className === classItem.name
    );

    if (hasStudents) {
      alert(`Không thể xóa lớp "${classItem.name}" vì vẫn còn sinh viên thuộc lớp này.`);
      return;
    }
    
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa lớp "${classItem.name}" không?`
    );

    if (confirmed) {
      this.facade.deleteClass(classItem.id);
    }
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.facade.setSearchTerm(input.value);
  }

  toggleNameSort(): void {
    if (this.facade.sortBy() === 'name') {
      this.facade.setSortDirection(
        this.facade.sortDirection() === 'asc' ? 'desc' : 'asc'
      );
    } else {
      this.facade.setSortBy('name');
      this.facade.setSortDirection('asc');
    }
  }
}
