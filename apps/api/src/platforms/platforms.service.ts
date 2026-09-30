import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { assertHttpUrl } from '../common/http-url';
import { getDatabase } from '../db/connection';
import { platforms } from '../db/schema/platforms';
import type { UpdatePlatformUrlDto } from './dto/update-platform-url.dto';

@Injectable()
export class PlatformsService {
  private db = getDatabase();

  async listPlatforms(staffRole?: string) {
    const rows = await this.db
      .select({
        id: platforms.id,
        slug: platforms.slug,
        name: platforms.name,
        signpostingUrl: platforms.signpostingUrl,
        sortOrder: platforms.sortOrder,
      })
      .from(platforms)
      .where(eq(platforms.isActive, true))
      .orderBy(asc(platforms.sortOrder));

    return {
      platforms: rows,
      canEdit: staffRole === 'admin',
    };
  }

  async updatePlatformUrl(slug: string, staffRole: string | undefined, dto: UpdatePlatformUrlDto) {
    if (staffRole !== 'admin') {
      throw new ForbiddenException('Only staff admins can edit platform links');
    }

    const trimmedUrl = dto.signpostingUrl?.trim();
    const signpostingUrl = trimmedUrl ? assertHttpUrl(trimmedUrl) : null;

    const [updated] = await this.db
      .update(platforms)
      .set({
        signpostingUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(platforms.slug, slug), eq(platforms.isActive, true)))
      .returning({
        id: platforms.id,
        slug: platforms.slug,
        name: platforms.name,
        signpostingUrl: platforms.signpostingUrl,
        sortOrder: platforms.sortOrder,
      });

    if (!updated) {
      throw new NotFoundException(`Unknown active platform: ${slug}`);
    }

    return updated;
  }
}
