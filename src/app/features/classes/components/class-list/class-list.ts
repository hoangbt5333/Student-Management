import { Component, inject, OnInit } from '@angular/core';
import { ClassFacade } from '../../data-access/class.facade';
import type { ClassModel } from '../../data-access/models/class.model';
import { ClassForm } from '../class-form/class-form';

@Component({
  imports: [ClassForm],
  selector: 'app-class-list',
  styleUrl: './class-list.css',
  templateUrl: './class-list.html',
})
export class ClassList implements OnInit {
  readonly facade = inject(ClassFacade);

  showForm = false;
  editingClass: ClassModel | null = null;

  ngOnInit(): void {
    this.facade.loadClasses();
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
    this.facade.saveClass(event.classItem, event.mode);
    this.closeForm();
  }

  onDelete(classItem: ClassModel): void {
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
}
