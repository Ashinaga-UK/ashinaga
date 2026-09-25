'use client';

import { PlatformIcon } from '@workspace/ui/components/platform-icon';
import { Loader2, Save } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import {
  getPlatformLinks,
  type PlatformLinksResponse,
  updatePlatformLink,
} from '../lib/api-client';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function PlatformLinksEditor() {
  const [data, setData] = useState<PlatformLinksResponse | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPlatformLinks()
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setValues(
          Object.fromEntries(
            response.platforms.map((platform) => [platform.slug, platform.signpostingUrl ?? ''])
          )
        );
      })
      .catch((loadError) => {
        console.error('Failed to load platform links:', loadError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data?.canEdit) {
    return null;
  }

  const handleSave = async (event: FormEvent, slug: string, name: string) => {
    event.preventDefault();
    setSavingSlug(slug);
    setError(null);
    setMessage(null);

    try {
      const value = values[slug]?.trim() || null;
      const updated = await updatePlatformLink(slug, value);
      setData((current) =>
        current
          ? {
              ...current,
              platforms: current.platforms.map((platform) =>
                platform.slug === slug ? updated : platform
              ),
            }
          : current
      );
      setValues((current) => ({ ...current, [slug]: updated.signpostingUrl ?? '' }));
      setMessage(`${name} link saved.`);
    } catch (saveError) {
      console.error('Failed to update platform link:', saveError);
      setError(
        saveError instanceof Error ? saveError.message : `Could not update the ${name} link.`
      );
    } finally {
      setSavingSlug(null);
    }
  };

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Platform links</CardTitle>
        <CardDescription>
          Set the links shown to Prep Year candidates and staff. Leave a field blank when there is
          no public destination.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? <output className="text-sm text-muted-foreground">{message}</output> : null}

        {data.platforms.map((platform) => (
          <form
            key={platform.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => handleSave(event, platform.slug, platform.name)}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PlatformIcon slug={platform.slug} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor={`platform-link-${platform.slug}`}>{platform.name}</Label>
                <Input
                  id={`platform-link-${platform.slug}`}
                  type="url"
                  value={values[platform.slug] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [platform.slug]: event.target.value,
                    }))
                  }
                  placeholder="No public URL"
                  disabled={savingSlug === platform.slug}
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={savingSlug === platform.slug}
              aria-label={`Save ${platform.name} link`}
            >
              {savingSlug === platform.slug ? <Loader2 className="animate-spin" /> : <Save />}
              Save
            </Button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
