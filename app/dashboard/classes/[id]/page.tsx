import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Edit } from 'lucide-react';
import {
  ClassFlagBadges,
  ClassStatusBadge,
  ClassTypeBadge,
} from '@/features/classes/components/class-badges';
import { ClassPriceDisplay } from '@/features/classes/components/class-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Class, LocalizedText } from '@/lib/dashboard/types';
import { formatDashboardDate, formatRupiah } from '@/lib/dashboard/utils';
import { getClassById } from '@/features/classes/data';

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function LocalizedBlock({ title, value }: { title: string; value: LocalizedText }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <InfoItem label="Indonesia" value={<p className="whitespace-pre-line font-normal">{value.id || '-'}</p>} />
        <InfoItem label="English" value={<p className="whitespace-pre-line font-normal">{value.en || '-'}</p>} />
        <InfoItem label="中文" value={<p className="whitespace-pre-line font-normal">{value.zh || '-'}</p>} />
      </div>
    </div>
  );
}

function getGalleryImages(classItem: Class) {
  return classItem.images.filter((image) => image.url !== classItem.coverImage);
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = await params;
  const classItem = await getClassById(id);

  if (!classItem) {
    notFound();
  }

  const galleryImages = getGalleryImages(classItem);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{classItem.name.id || classItem.name.en}</h1>
          <p className="mt-2 text-muted-foreground">{classItem.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classes
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/classes/${classItem.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gambar Kelas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {classItem.coverImage ? (
            <img
              src={classItem.coverImage}
              alt={classItem.name.en || classItem.name.id}
              className="h-72 w-full rounded-lg border object-cover"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada cover image.</p>
          )}
          {galleryImages.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {galleryImages.map((image) => (
                <img
                  key={image.url}
                  src={image.url}
                  alt={image.alt}
                  className="h-44 w-full rounded-lg border object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada gambar tambahan.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Kelas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Type" value={<ClassTypeBadge type={classItem.type} />} />
          <InfoItem label="Status" value={<ClassStatusBadge isActive={classItem.isActive} />} />
          <InfoItem label="Featured" value={<ClassFlagBadges classItem={classItem} />} />
          <InfoItem label="Level" value={classItem.level} />
          <InfoItem label="Harga" value={<ClassPriceDisplay classItem={classItem} />} />
          <InfoItem
            label="Harga Diskon"
            value={classItem.discountPrice === null || classItem.discountPrice === undefined ? '-' : formatRupiah(classItem.discountPrice)}
          />
          <InfoItem label="Total Sesi" value={`${classItem.totalSessions} sesi`} />
          <InfoItem label="Durasi Sesi" value={`${classItem.sessionDurationMinutes} menit`} />
          <InfoItem label="Created At" value={formatDashboardDate(classItem.createdAt)} />
          <InfoItem label="Updated At" value={formatDashboardDate(classItem.updatedAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nama dan Deskripsi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LocalizedBlock title="Nama Kelas" value={classItem.name} />
          <LocalizedBlock title="Long Description" value={classItem.longDescription} />
        </CardContent>
      </Card>
    </div>
  );
}
