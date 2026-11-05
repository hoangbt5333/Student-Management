export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'locked' | 'inactive';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  studentId?: string;
  teacherId?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface CreateUserDto {
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  password: string;
  status: UserStatus;
  studentId?: string;
  teacherId?: string;
}

export interface UpdateUserDto {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  studentId?: string;
  teacherId?: string;
}

export interface ChangeStatusDto {
  userId: string;
  status: UserStatus;
}
