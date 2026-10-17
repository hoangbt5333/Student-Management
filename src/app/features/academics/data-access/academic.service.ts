import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Grade, Subject, Teacher } from './academic.model';

@Injectable({ providedIn: 'root' })
export class AcademicService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001';

  getTeachers(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(`${this.apiUrl}/teachers`);
  }

  getTeacher(id: string): Observable<Teacher> {
    return this.http.get<Teacher>(`${this.apiUrl}/teachers/${encodeURIComponent(id)}`);
  }

  createTeacher(teacher: Teacher): Observable<Teacher> {
    const { id, ...data } = teacher;
    return this.http.post<Teacher>(`${this.apiUrl}/teachers`, { ...data, code: teacher.code ?? id });
  }

  updateTeacher(teacher: Teacher): Observable<Teacher> {
    return this.http.put<Teacher>(`${this.apiUrl}/teachers/${encodeURIComponent(teacher.id)}`, teacher);
  }

  deleteTeacher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/teachers/${encodeURIComponent(id)}`);
  }

  getSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.apiUrl}/subjects`);
  }

  createSubject(subject: Subject): Observable<Subject> {
    const { id, ...data } = subject;
    return this.http.post<Subject>(`${this.apiUrl}/subjects`, { ...data, code: subject.code ?? id });
  }

  updateSubject(subject: Subject): Observable<Subject> {
    return this.http.put<Subject>(`${this.apiUrl}/subjects/${encodeURIComponent(subject.id)}`, subject);
  }

  deleteSubject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/subjects/${encodeURIComponent(id)}`);
  }

  getGrades(): Observable<Grade[]> {
    return this.http.get<Grade[]>(`${this.apiUrl}/grades`);
  }

  createGrade(grade: Omit<Grade, 'id'>): Observable<Grade> {
    return this.http.post<Grade>(`${this.apiUrl}/grades`, grade);
  }

  updateGrade(grade: Grade): Observable<Grade> {
    return this.http.put<Grade>(`${this.apiUrl}/grades/${encodeURIComponent(grade.id)}`, grade);
  }
}
