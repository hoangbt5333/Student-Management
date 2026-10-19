export type UserRole = 'admin' | 'teacher' | 'student';

export interface AuthUser {
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
    studentId?: string;
    teacherId?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}