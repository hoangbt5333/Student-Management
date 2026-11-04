import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Teacher } from '../models/teacher.model';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/teachers';

  getTeachers(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(this.apiUrl);
  }

  getTeacher(id: string): Observable<Teacher> {
    return this.http.get<Teacher>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  createTeacher(teacher: Teacher): Observable<Teacher> {
    const { id, ...data } = teacher;
    return this.http.post<Teacher>(this.apiUrl, {
      ...data,
      code: teacher.code ?? id
    });
  }

  updateTeacher(teacher: Teacher): Observable<Teacher> {
    return this.http.put<Teacher>(
      `${this.apiUrl}/${encodeURIComponent(teacher.id)}`,
      teacher
    );
  }

  deleteTeacher(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${encodeURIComponent(id)}`
    );
  }
}
