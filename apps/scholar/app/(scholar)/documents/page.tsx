'use client';

import { FileText, FolderOpen, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMyProfile, type ScholarProfile } from '../../../lib/api/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

export default function DocumentsPage() {
  const [profile, setProfile] = useState<ScholarProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => setError('Failed to load documents.'))
      .finally(() => setLoading(false));
  }, []);

  const documents = profile?.documents ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Documents</h1>
        <p className="text-muted-foreground mt-1">
          Files on your profile. Required Prep Year uploads will be tracked here.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents...
        </div>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2" />
            No documents uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {doc.name}
                </CardTitle>
                <CardDescription>
                  {doc.type}
                  {doc.uploadDate
                    ? ` · Uploaded ${new Date(doc.uploadDate).toLocaleDateString()}`
                    : ''}
                  {doc.size ? ` · ${doc.size}` : ''}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
