import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Grade } from '../models/grade.model';

@Injectable({
  providedIn: 'root'
})
export class GradeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/grades';

  getGrades(): Observable<Grade[]> {
    return this.http.get<Grade[]>(this.apiUrl);
  }

  createGrade(grade: Omit<Grade, 'id'>): Observable<Grade> {
    return this.http.post<Grade>(this.apiUrl, grade);
  }

  updateGrade(grade: Grade): Observable<Grade> {
    return this.http.put<Grade>(
      `${this.apiUrl}/${encodeURIComponent(grade.id)}`,
      grade
    );
  }
}
