export type UserRole = 'admin' | 'teacher' | 'student';
export type AppPermission = 'view-students' | 'manage-students' | 'view-classes' | 'manage-classes' | 'view-teachers' | 'manage-teachers' | 'view-subjects' | 'manage-subjects' | 'view-grades' | 'manage-grades' | 'manage-users';

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