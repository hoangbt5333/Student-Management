import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

interface Student {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  classId: string;
  className: string;
  faculty: string;
}

interface StudentClass {
  id: string;
  name: string;
  department: string;
  academicYear: string;
}

const API_BASE_URL = "http://localhost:3001";

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `API Error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function createServer(): McpServer {
  // 1. Khởi tạo MCP Server
  const server = new McpServer({
    name: "student-management-mcp",
    version: "1.0.0",
  });

  server.registerResource(
    "classes-list",
    "classes://list",
    {
        title: "Danh sách lớp học",
        description: "Danh sách các lớp học trong hệ thống Student Management",
        mimeType: "application/json",
    },
    async (uri) => {
        const classes = await fetchApi<StudentClass[]>("/classes");

        // Chỉ trả về các trường cần thiết
        const safeClasses = classes.map((studentClass) => ({
        id: studentClass.id,
        name: studentClass.name,
        department: studentClass.department,
        academicYear: studentClass.academicYear,
        }));

        return {
        contents: [
            {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(safeClasses, null, 2),
            },
        ],
        };
    },
    );

  // 2. Đăng ký tool đầu tiên
  server.registerTool(
    "get_students",
    {
      description: "Lấy danh sách sinh viên từ Student Management API",
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe("Từ khóa tìm theo tên hoặc mã sinh viên"),
      }),
    },
    async ({ search }) => {
        try {
            // Gọi API của json-server
            const response = await fetch(
            "http://localhost:3001/students",
            );

            if (!response.ok) {
            throw new Error(
                `API error: ${response.status} ${response.statusText}`,
            );
            }

            // Nhận dữ liệu sinh viên
            const students = await response.json();

            // Lọc sinh viên nếu có từ khóa
            const filteredStudents = search
            ? students.filter((student: any) =>
                String(student.fullName ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                String(student.studentId ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
            : students;

            // Trả dữ liệu về Copilot
            return {
            content: [
                {
                type: "text",
                text: JSON.stringify(filteredStudents, null, 2),
                },
            ],
            };
        } catch (error) {
            return {
            content: [
                {
                type: "text",
                text: `Không thể lấy danh sách sinh viên: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                },
            ],
            isError: true,
            };
        }
    },    
  );

  server.registerTool(
    "get_student_by_code",
    {
        description: "Tìm sinh viên theo mã sinh viên (MSSV)",
        inputSchema: z.object({
        code: z.string().min(1).describe("Mã sinh viên"),
        }),
    },
    async ({ code }) => {
        try {
        const students = await fetchApi<Student[]>("/students");

        const student = students.find(
            (item) => item.code.toLowerCase() === code.toLowerCase(),
        );

        if (!student) {
            return {
            content: [
                {
                type: "text",
                text: `Không tìm thấy sinh viên có mã ${code}`,
                },
            ],
            };
        }

        return {
            content: [
            {
                type: "text",
                text: JSON.stringify(student, null, 2),
            },
            ],
        };
        } catch (error) {
        return {
            content: [
            {
                type: "text",
                text: `Lỗi tìm sinh viên: ${
                error instanceof Error ? error.message : String(error)
                }`,
            },
            ],
            isError: true,
        };
        }
    },
    );
    server.registerTool(
    "get_classes",
    {
        description: "Lấy danh sách lớp học",
        inputSchema: z.object({
        search: z.string().optional().describe("Tìm theo tên lớp hoặc khoa"),
        }),
    },
    async ({ search }) => {
        try {
        const classes = await fetchApi<StudentClass[]>("/classes");

        const filteredClasses = search
            ? classes.filter(
                (item) =>
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.department.toLowerCase().includes(search.toLowerCase()),
            )
            : classes;

        return {
            content: [
            {
                type: "text",
                text: JSON.stringify(filteredClasses, null, 2),
            },
            ],
        };
        } catch (error) {
        return {
            content: [
            {
                type: "text",
                text: `Lỗi lấy danh sách lớp: ${
                error instanceof Error ? error.message : String(error)
                }`,
            },
            ],
            isError: true,
        };
        }
    },
    );
    

  return server;
}

// 5. Khởi động server qua stdio
void serveStdio(createServer);

console.error("Student Management MCP Server is running");
