import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Subject } from '../models/subject.model';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/subjects';

  getSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(this.apiUrl);
  }

  getSubject(id: string): Observable<Subject> {
    return this.http.get<Subject>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  createSubject(subject: Subject): Observable<Subject> {
    const { id, ...data } = subject;
    return this.http.post<Subject>(this.apiUrl, {
      ...data,
      code: subject.code ?? id
    });
  }

  updateSubject(subject: Subject): Observable<Subject> {
    return this.http.put<Subject>(
      `${this.apiUrl}/${encodeURIComponent(subject.id)}`,
      subject
    );
  }

  deleteSubject(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${encodeURIComponent(id)}`
    );
  }
}
