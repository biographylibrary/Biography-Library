'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';

export interface ViewGalleryPhoto {
  id: string;
  url: string;
  caption: string | null;
}

interface BiographyViewGalleryProps {
  biographyId: string;
  shareToken?: string | null;
}

function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
}

export function BiographyViewGallery({ biographyId, shareToken }: BiographyViewGalleryProps) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<ViewGalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const qs = shareToken ? `?shareToken=${encodeURIComponent(shareToken)}` : '';
        const headers: Record<string, string> = {};
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const res = await fetch(`/api/biography/${biographyId}/gallery-photos${qs}`, {
          headers,
        });
        if (!res.ok) {
          if (!cancelled) setPhotos([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setPhotos((data.photos ?? []) as ViewGalleryPhoto[]);
        }
      } catch {
        if (!cancelled) setPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [biographyId, shareToken]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActiveIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!open || !carouselApi) return;
    carouselApi.scrollTo(startIndex, true);
    setActiveIndex(startIndex);
  }, [open, startIndex, carouselApi]);

  const openAt = useCallback((index: number) => {
    setStartIndex(index);
    setOpen(true);
  }, []);

  if (loading || photos.length === 0) return null;

  const activePhoto = photos[activeIndex] ?? photos[0];

  return (
    <>
      <div className="mt-6 not-prose">
        <h2 className="text-sm font-medium text-foreground mb-3">{t.view.galleryPhotos}</h2>
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => openAt(index)}
                className="block h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-md border border-border bg-muted/30 hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
                aria-label={
                  photo.caption
                    ? interpolate(t.view.galleryOpenPhoto, { caption: photo.caption })
                    : interpolate(t.view.galleryPhotoCounter, {
                        current: String(index + 1),
                        total: String(photos.length),
                      })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[min(96vw,56rem)] p-0 gap-0 overflow-hidden border-border bg-background">
          <DialogTitle className="sr-only">{t.view.galleryLightboxTitle}</DialogTitle>
          <Carousel
            setApi={setCarouselApi}
            opts={{ startIndex, loop: photos.length > 1 }}
            className="w-full"
          >
            <CarouselContent className="-ml-0">
              {photos.map((photo) => (
                <CarouselItem key={photo.id} className="pl-0">
                  <div className="flex flex-col items-center bg-muted/20">
                    <div className="relative w-full flex items-center justify-center min-h-[40vh] max-h-[70vh] p-4 sm:p-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption ?? ''}
                        className="max-h-[min(70vh,640px)] max-w-full w-auto h-auto object-contain"
                      />
                    </div>
                    {photo.caption && (
                      <p className="w-full px-4 pb-4 text-sm text-center text-muted-foreground">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious
                  className="left-2 sm:left-4 border-border bg-background/90"
                  aria-label={t.view.galleryLightboxPrevious}
                />
                <CarouselNext
                  className="right-2 sm:right-4 border-border bg-background/90"
                  aria-label={t.view.galleryLightboxNext}
                />
              </>
            )}
          </Carousel>
          {photos.length > 1 && (
            <p className="text-xs text-center text-muted-foreground pb-3">
              {interpolate(t.view.galleryPhotoCounter, {
                current: String(activeIndex + 1),
                total: String(photos.length),
              })}
            </p>
          )}
          {activePhoto?.caption && photos.length === 1 && (
            <p className="text-sm text-center text-muted-foreground px-4 pb-4">
              {activePhoto.caption}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
