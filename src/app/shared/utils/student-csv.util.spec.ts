import { describe, expect, it } from 'vitest';
import type { Student } from '../../features/students/models/student.model';
import { studentsToCsv } from './student-csv.util';

const student: Student = {
  id: '1',
  code: 'SV001',
  name: 'Nguyễn Văn An',
  email: 'an@example.com',
  phone: '0123456789',
  classId: 'class-1',
  className: 'Công nghệ thông tin',
  faculty: 'Khoa học máy tính',
  status: 'active',
};

describe('studentsToCsv', () => {
  it('returns the Student headers for an empty list', () => {
    expect(studentsToCsv([])).toBe('id,code,name,email,phone,classId,className,faculty,status');
  });

  it('serializes student values without changing Vietnamese Unicode', () => {
    expect(studentsToCsv([student])).toBe(
      [
        'id,code,name,email,phone,classId,className,faculty,status',
        '1,SV001,Nguyễn Văn An,an@example.com,0123456789,class-1,Công nghệ thông tin,Khoa học máy tính,active',
      ].join('\r\n'),
    );
  });

  it('quotes fields containing commas, double quotes, and newlines', () => {
    expect(
      studentsToCsv([
        {
          ...student,
          name: 'An, "Bình"',
          email: 'an@example.com\nbackup@example.com',
        },
      ]),
    ).toBe(
      [
        'id,code,name,email,phone,classId,className,faculty,status',
        '1,SV001,"An, ""Bình""","an@example.com\nbackup@example.com",0123456789,class-1,Công nghệ thông tin,Khoa học máy tính,active',
      ].join('\r\n'),
    );
  });

  it('serializes optional and empty values as empty fields', () => {
    const {
      code: _code,
      classId: _classId,
      className: _className,
      faculty: _faculty,
      status: _status,
      ...requiredFields
    } = student;
    expect(
      studentsToCsv([{ ...requiredFields, code: '', classId: '', className: '', faculty: '' }]),
    ).toBe(
      'id,code,name,email,phone,classId,className,faculty,status\r\n1,,Nguyễn Văn An,an@example.com,0123456789,,,,',
    );
  });
});
