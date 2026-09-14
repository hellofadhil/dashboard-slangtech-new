import { Spinner } from '@/components/ui/spinner';

export default function TeachersLoading() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <Spinner />
    </div>
  );
}
