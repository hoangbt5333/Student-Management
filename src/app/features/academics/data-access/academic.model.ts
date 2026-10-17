export interface Teacher {
  id: string;
  code?: string;
  name: string;
  email: string;
  department: string;
}

export interface Subject {
  id: string;
  code?: string;
  name: string;
  credits: number;
  teacherId?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  score: number;
}
