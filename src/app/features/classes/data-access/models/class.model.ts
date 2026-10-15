export interface ClassModel {
    id: string;
    name: string;
    department: string;
    academicYear: string;
}

export type CreateClassDto = ClassModel;

export type UpdateClassDto = Partial<Omit<CreateClassDto, 'id'>>;