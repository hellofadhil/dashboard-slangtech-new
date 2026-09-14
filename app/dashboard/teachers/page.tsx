import { TeacherTable } from '@/features/teachers/components/teacher-table';
import { DataLoadAlert } from '@/components/dashboard/data-load-alert';
import { emptyTeachers, safelyLoad } from '@/lib/dashboard/safe-data';
import type { TeacherQuery } from '@/lib/dashboard/types';
import { getTeachers } from '@/features/teachers/data';

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseTeacherQuery(searchParams: Record<string, string | string[] | undefined>): TeacherQuery {
  return {
    search: getParam(searchParams, 'search') ?? '',
  };
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseTeacherQuery(await searchParams);
  const teachersResult = await safelyLoad(getTeachers, emptyTeachers);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Guru</h1>
        <p className="text-muted-foreground">
          Kelola akun dan profil guru SlangTech.
        </p>
      </div>
      <DataLoadAlert message={teachersResult.error} />
      <TeacherTable teachers={teachersResult.data} filters={filters} />
    </div>
  );
}
