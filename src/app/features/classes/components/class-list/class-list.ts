import { Component, inject, OnInit, effect } from '@angular/core';
import { ClassFacade } from '../../data-access/class.facade';
import type { ClassModel } from '../../data-access/models/class.model';
import { ClassForm } from '../class-form/class-form';
import { StudentFacade } from '../../../students/data-access/student.facade';

@Component({
  imports: [ClassForm],
  selector: 'app-class-list',
  styleUrl: './class-list.css',
  templateUrl: './class-list.html',
})
export class ClassList implements OnInit {
  readonly facade = inject(ClassFacade);
  readonly studentFacede = inject(StudentFacade);

  showForm = false;
  editingClass: ClassModel | null = null;

  private waitingForSave = false;
  private readonly saveEffect = effect(() => {
    const success = this.facade.successMessage();
    const error = this.facade.errorMessage();

    if (!this.waitingForSave) {
      return;
    }

    if (success) {
      this.waitingForSave = false;
      this.closeForm;
    } else {
      this.waitingForSave = false;
    }
  });

  ngOnInit(): void {
    this.facade.loadClasses();
    this.studentFacede.loadStudents();
  }

  openAddForm(): void {
    this.editingClass = null;
    this.showForm = true;
    this.facade.clearMessages();
  }

  openEditForm(classItem: ClassModel): void {
    this.editingClass = { ...classItem };
    this.showForm = true;
    this.facade.clearMessages();
  }

  closeForm(): void {
    this.showForm = false;
    this.editingClass = null;
  }

  onSave(event: {
    classItem: ClassModel;
    mode: 'add' | 'update';
  }): void {
    this.waitingForSave = true;
    this.facade.saveClass(event.classItem, event.mode);
  }

  onDelete(classItem: ClassModel): void {
    const students = this.studentFacede.students();

    const hasStudents = students.some(student =>
      student.classId
        ? student.classId === classItem.id
        : student.className === classItem.name
    )

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
