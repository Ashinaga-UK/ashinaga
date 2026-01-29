'use client';

import { AlertCircle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { useMyAnnouncements } from '../../../lib/hooks/use-queries';

export default function AnnouncementsPage() {
  const { data: announcements, isLoading, error } = useMyAnnouncements();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Announcements</h2>

      {isLoading ? (
        <Card className="border-ashinaga-teal-100 dark:border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="w-full h-full rounded-full border-4 border-ashinaga-teal-200 border-t-ashinaga-teal-600 animate-spin" />
                </div>
                <p className="text-muted-foreground">Loading announcements...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400">Failed to load announcements. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !announcements || announcements.length === 0 ? (
        <Card className="border-ashinaga-teal-100 dark:border-border">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No announcements yet</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for updates from staff</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="border-ashinaga-teal-100 dark:border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <span>From {announcement.createdBy}</span>
                      <span>•</span>
                      <span>
                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
