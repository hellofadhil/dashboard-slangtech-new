import { StudentTable } from '@/features/students/components/student-table';
import { DataLoadAlert } from '@/components/dashboard/data-load-alert';
import { emptyStudents, safelyLoad } from '@/lib/dashboard/safe-data';
import { StudentQuery } from '@/lib/dashboard/types';
import { getStudents } from '@/features/students/data';

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseStudentQuery(searchParams: Record<string, string | string[] | undefined>): StudentQuery {
  return {
    search: getParam(searchParams, 'search') ?? '',
  };
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseStudentQuery(await searchParams);
  const studentsResult = await safelyLoad(getStudents, emptyStudents);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Siswa</h1>
        <p className="text-muted-foreground">
          Lihat data profil siswa yang terdaftar di SlangTech.
        </p>
      </div>
      <DataLoadAlert message={studentsResult.error} />
      <StudentTable students={studentsResult.data} filters={filters} />
    </div>
  );
}
