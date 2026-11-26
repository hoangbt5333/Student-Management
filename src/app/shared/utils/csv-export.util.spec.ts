import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  UTF8_BOM,
  downloadCsv,
  escapeCsvCell,
  objectsToCsv,
  type CsvColumn,
} from './csv-export.util';

interface SampleTeacher {
  id: string;
  code: string;
  name: string;
  department: string;
  yearsOfExperience: number;
  active: boolean;
  notes?: string | null;
}

interface SampleSubject {
  code: string;
  title: string;
  credits: number;
}

describe('escapeCsvCell', () => {
  it('returns an empty string for null and undefined', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('converts numbers and booleans with String()', () => {
    expect(escapeCsvCell(0)).toBe('0');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(true)).toBe('true');
    expect(escapeCsvCell(false)).toBe('false');
  });

  it('preserves plain strings including Vietnamese Unicode characters', () => {
    expect(escapeCsvCell('Nguyễn Thị Minh Châu')).toBe('Nguyễn Thị Minh Châu');
    expect(escapeCsvCell('Công nghệ thông tin')).toBe('Công nghệ thông tin');
  });

  it('quotes and escapes cells containing commas, double quotes, CR, or LF', () => {
    expect(escapeCsvCell('Hà Nội, Việt Nam')).toBe('"Hà Nội, Việt Nam"');
    expect(escapeCsvCell('Bộ môn "Toán - Tin"')).toBe('"Bộ môn ""Toán - Tin"""');
    expect(escapeCsvCell('Dòng 1\nDòng 2')).toBe('"Dòng 1\nDòng 2"');
    expect(escapeCsvCell('Dòng 1\rDòng 2')).toBe('"Dòng 1\rDòng 2"');
    expect(escapeCsvCell('Dòng 1\r\nDòng 2')).toBe('"Dòng 1\r\nDòng 2"');
  });
});

describe('objectsToCsv', () => {
  const teacherColumns: readonly CsvColumn<SampleTeacher>[] = [
    { header: 'Mã GV', accessor: 'code' },
    { header: 'Họ và tên', accessor: 'name' },
    { header: 'Khoa, Bộ môn', accessor: 'department' },
    { header: 'Số năm KN', accessor: 'yearsOfExperience' },
    { header: 'Đang giảng dạy', accessor: 'active' },
    { header: 'Ghi chú', accessor: (row) => row.notes },
  ];

  it('returns UTF8_BOM only when rows is empty and columns are omitted', () => {
    expect(objectsToCsv<SampleTeacher>([])).toBe(UTF8_BOM);
  });

  it('returns UTF8_BOM plus escaped header line when rows is empty and columns are provided', () => {
    expect(objectsToCsv<SampleTeacher>([], teacherColumns)).toBe(
      `${UTF8_BOM}Mã GV,Họ và tên,"Khoa, Bộ môn",Số năm KN,Đang giảng dạy,Ghi chú`,
    );
  });

  it('serializes interface objects with explicit columns, UTF-8 BOM, CRLF endings, and Vietnamese Unicode', () => {
    const teachers: readonly SampleTeacher[] = [
      {
        id: '1',
        code: 'GV001',
        name: 'Trần Văn "Hùng"',
        department: 'Khoa học máy tính',
        yearsOfExperience: 10,
        active: true,
        notes: 'Phụ trách\nCTĐT mới',
      },
      {
        id: '2',
        code: 'GV002',
        name: 'Lê Thị Hoa',
        department: 'Toán, Tin học',
        yearsOfExperience: 0,
        active: false,
        notes: null,
      },
    ];

    const csv = objectsToCsv(teachers, teacherColumns);

    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv).toBe(
      UTF8_BOM +
        [
          'Mã GV,Họ và tên,"Khoa, Bộ môn",Số năm KN,Đang giảng dạy,Ghi chú',
          'GV001,"Trần Văn ""Hùng""",Khoa học máy tính,10,true,"Phụ trách\nCTĐT mới"',
          'GV002,Lê Thị Hoa,"Toán, Tin học",0,false,',
        ].join('\r\n'),
    );
  });

  it('auto-generates columns from Object.keys(rows[0]) when columns are omitted', () => {
    const subjects: readonly SampleSubject[] = [
      { code: 'IT101', title: 'Nhập môn lập trình', credits: 3 },
      { code: 'IT102', title: 'Cấu trúc dữ liệu, Giải thuật', credits: 4 },
    ];

    const csv = objectsToCsv(subjects);

    expect(csv).toBe(
      UTF8_BOM +
        [
          'code,title,credits',
          'IT101,Nhập môn lập trình,3',
          'IT102,"Cấu trúc dữ liệu, Giải thuật",4',
        ].join('\r\n'),
    );
  });

  it('escapes auto-generated header keys and CRLF cell values', () => {
    const rows = [{ 'col,1': 'val\r\n1', 'col"2': undefined as string | undefined }];

    expect(objectsToCsv(rows)).toBe(
      UTF8_BOM + ['"col,1","col""2"', '"val\r\n1",'].join('\r\n'),
    );
  });
});

async function readBlobWithBom(blob: Blob): Promise<string> {
  return new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blob.arrayBuffer());
}

describe('downloadCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a text/csv Blob, triggers anchor download with filename, and revokes the object URL', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv-export');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const createdAnchor = document.createElement('a');
    const clickSpy = vi.spyOn(createdAnchor, 'click').mockImplementation(() => undefined);
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(createdAnchor);

    const result = downloadCsv(`${UTF8_BOM}code,name\r\nGV01,Nguyễn An`, 'teachers.csv');

    expect(result).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(await readBlobWithBom(blob)).toBe(`${UTF8_BOM}code,name\r\nGV01,Nguyễn An`);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(createdAnchor.href).toBe('blob:csv-export');
    expect(createdAnchor.download).toBe('teachers.csv');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv-export');
  });

  it('prepends UTF8_BOM when missing and does not duplicate UTF8_BOM when already present', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv-bom');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadCsv('id,name\r\n1,An', 'without-bom.csv');
    downloadCsv(`${UTF8_BOM}id,name\r\n1,An`, 'with-bom.csv');

    const firstBlob = createObjectURL.mock.calls[0][0] as Blob;
    const secondBlob = createObjectURL.mock.calls[1][0] as Blob;

    expect(await readBlobWithBom(firstBlob)).toBe(`${UTF8_BOM}id,name\r\n1,An`);
    expect(await readBlobWithBom(secondBlob)).toBe(`${UTF8_BOM}id,name\r\n1,An`);
  });

  it('revokes object URL in finally even if click throws', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv-error');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click failed');
    });

    expect(() => downloadCsv(`${UTF8_BOM}a\r\n1`, 'error.csv')).toThrow('click failed');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv-error');
  });

  it('returns false in SSR environments when document is undefined', () => {
    vi.stubGlobal('document', undefined);

    expect(downloadCsv('a,b', 'ssr.csv')).toBe(false);
  });

  it('returns false when URL is undefined or URL.createObjectURL is unavailable', () => {
    vi.stubGlobal('URL', undefined);
    expect(downloadCsv('a,b', 'no-url.csv')).toBe(false);

    vi.stubGlobal('URL', {});
    expect(downloadCsv('a,b', 'no-create-object-url.csv')).toBe(false);
  });
});
