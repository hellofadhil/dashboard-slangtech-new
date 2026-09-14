import { ClassTable } from '@/features/classes/components/class-table';
import { DataLoadAlert } from '@/components/dashboard/data-load-alert';
import { emptyClasses, safelyLoad } from '@/lib/dashboard/safe-data';
import { ClassQuery } from '@/lib/dashboard/types';
import { getClasses } from '@/features/classes/data';

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseClassQuery(searchParams: Record<string, string | string[] | undefined>): ClassQuery {
  const type = getParam(searchParams, 'type');
  const status = getParam(searchParams, 'status');

  return {
    search: getParam(searchParams, 'search') ?? '',
    type: type === 'private' || type === 'group' ? type : 'all',
    status: status === 'active' || status === 'inactive' ? status : 'all',
  };
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseClassQuery(await searchParams);
  const classesResult = await safelyLoad(getClasses, emptyClasses);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Kelas</h1>
        <p className="text-muted-foreground">
          Kelola kelas bahasa kamu disini.
        </p>
      </div>
      <DataLoadAlert message={classesResult.error} />
      <ClassTable classes={classesResult.data} filters={filters} />
    </div>
  );
}
