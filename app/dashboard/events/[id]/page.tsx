import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Edit } from 'lucide-react';
import {
  EventPriceTypeBadge,
  EventStatusBadge,
} from '@/features/events/components/event-badges';
import { EventPriceDisplay } from '@/features/events/components/event-display';
import { EventParticipantsTable } from '@/features/events/components/event-participants-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Event, LocalizedText } from '@/lib/dashboard/types';
import { formatDashboardDate, getEventTrainerNames } from '@/lib/dashboard/utils';
import { getEventById } from '@/features/events/data';
import { getEventEnrollmentsByEventId } from '@/features/event-enrollments/data';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
        <InfoItem label="Mandarin" value={<p className="whitespace-pre-line font-normal">{value.zh || '-'}</p>} />
      </div>
    </div>
  );
}

function getGalleryImages(eventItem: Event) {
  return eventItem.images.filter((image) => image.url !== eventItem.coverImage);
}

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseEventDetailTab(searchParams: Record<string, string | string[] | undefined>) {
  const tab = getParam(searchParams, 'tab');
  return tab === 'schedule' || tab === 'participants' ? tab : 'overview';
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { id } = await params;
  const [eventItem, paramsValue] = await Promise.all([
    getEventById(id),
    searchParams,
  ]);

  if (!eventItem) {
    notFound();
  }

  const activeTab = parseEventDetailTab(paramsValue);
  const enrollments = await getEventEnrollmentsByEventId(eventItem.id);
  const galleryImages = getGalleryImages(eventItem);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{eventItem.name.id || eventItem.name.en}</h1>
          <p className="mt-2 text-muted-foreground">{eventItem.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/events/${eventItem.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg border bg-muted/40 p-1 md:w-fit md:min-w-[520px]">
          <TabsTrigger value="overview" className="h-11">Overview</TabsTrigger>
          <TabsTrigger value="schedule" className="h-11">Schedule</TabsTrigger>
          <TabsTrigger value="participants" className="h-11">Peserta Terdaftar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Gambar Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventItem.coverImage ? (
                <img
                  src={eventItem.coverImage}
                  alt={eventItem.name.en || eventItem.name.id}
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
              <CardTitle>Ringkasan Event</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Tipe Harga" value={<EventPriceTypeBadge priceType={eventItem.priceType} />} />
              <InfoItem label="Harga" value={<EventPriceDisplay eventItem={eventItem} />} />
              <InfoItem label="Total Sesi" value={`${eventItem.sessions.length} sesi`} />
              <InfoItem label="Mulai" value={formatDashboardDate(eventItem.startsAt)} />
              <InfoItem label="Timezone" value={eventItem.timezone} />
              <InfoItem label="Trainer" value={getEventTrainerNames(eventItem)} />
              <InfoItem label="Status" value={<EventStatusBadge isActive={eventItem.isActive} />} />
              <InfoItem label="Created At" value={formatDashboardDate(eventItem.createdAt)} />
              <InfoItem label="Updated At" value={formatDashboardDate(eventItem.updatedAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Narahubung</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoItem label="Nama" value={eventItem.contact.name || '-'} />
              <InfoItem label="WhatsApp" value={eventItem.contact.whatsappNumber || '-'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nama dan Deskripsi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocalizedBlock title="Nama Event" value={eventItem.name} />
              <LocalizedBlock title="Long Description" value={eventItem.longDescription} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Jadwal Sesi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventItem.sessions.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {eventItem.sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border p-4">
                      <p className="font-medium">{session.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatDashboardDate(session.startsAt)}</p>
                      {session.notes ? (
                        <p className="mt-2 whitespace-pre-line text-sm">{session.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada sesi.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle>Peserta Terdaftar</CardTitle>
            </CardHeader>
            <CardContent>
              <EventParticipantsTable enrollments={enrollments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
