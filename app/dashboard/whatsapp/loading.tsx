import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function WhatsAppLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-44 w-full rounded-md" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
