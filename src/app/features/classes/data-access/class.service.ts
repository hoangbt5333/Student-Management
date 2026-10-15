import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { ClassModel, CreateClassDto, UpdateClassDto } from "./models/class.model";

@Injectable({
    providedIn: 'root'
})

export class ClassService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3000/classes';

  getAll(): Observable<ClassModel[]> {
    return this.http.get<ClassModel[]>(this.apiUrl);
  }

  getById(id: string): Observable<ClassModel> {
    return this.http.get<ClassModel>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateClassDto): Observable<ClassModel> {
    return this.http.post<ClassModel>(this.apiUrl, data);
  }

  update(
    id: string,
    data: UpdateClassDto
  ): Observable<ClassModel> {
    return this.http.patch<ClassModel>(
      `${this.apiUrl}/${id}`,
      data
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}