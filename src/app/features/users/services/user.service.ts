import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/users';

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  updateUser(user: User): Observable<User> {
    return this.http.put<User>(
      `${this.apiUrl}/${encodeURIComponent(user.id)}`,
      user
    );
  }

  patchUser(id: string, changes: Partial<User>): Observable<User> {
    return this.http.patch<User>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      changes
    );
  }
}
