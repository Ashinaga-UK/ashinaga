import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { database } from '../db/connection';
import { resourceFilters, resources, scholars } from '../db/schema';
import { CreateResourceDto, ResourceFilterDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

type ResourceFilter = {
  type: string;
  value: string;
};

@Injectable()
export class ResourcesService {
  async createResource(dto: CreateResourceDto, userId: string) {
    const { filters = [], ...resourceData } = dto;

    const [resource] = await database
      .insert(resources)
      .values({
        ...resourceData,
        status: resourceData.status ?? 'draft',
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    await this.replaceFilters(resource.id, filters);

    const savedFilters = await this.getResourceFilters(resource.id);
    return this.formatResource(resource, savedFilters);
  }

  async listResources() {
    const rows = await database
      .select()
      .from(resources)
      .where(eq(resources.archived, false))
      .orderBy(asc(resources.title));

    return Promise.all(
      rows.map(async (resource) => {
        const filters = await this.getResourceFilters(resource.id);
        return this.formatResource(resource, filters);
      })
    );
  }

  async updateResource(resourceId: string, dto: UpdateResourceDto, userId: string) {
    const existing = await database
      .select()
      .from(resources)
      .where(and(eq(resources.id, resourceId), eq(resources.archived, false)))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundException('Resource not found');
    }

    const { filters, ...resourceData } = dto;
    const [updated] = await database
      .update(resources)
      .set({
        ...resourceData,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, resourceId))
      .returning();

    if (filters) {
      await this.replaceFilters(resourceId, filters);
    }

    const nextFilters = await this.getResourceFilters(resourceId);
    return this.formatResource(updated, nextFilters);
  }

  async archiveResource(resourceId: string, userId: string) {
    const [updated] = await database
      .update(resources)
      .set({
        archived: true,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, resourceId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Resource not found');
    }

    return { success: true };
  }

  async getResourcesForScholar(userId: string) {
    const scholarRows = await database
      .select()
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholarRows[0]) {
      return [];
    }

    const scholar = scholarRows[0];
    const liveResources = await database
      .select()
      .from(resources)
      .where(and(eq(resources.status, 'live'), eq(resources.archived, false)))
      .orderBy(asc(resources.title));

    const withFilters = await Promise.all(
      liveResources.map(async (resource) => ({
        resource,
        filters: await this.getResourceFilters(resource.id),
      }))
    );

    return withFilters
      .filter(({ filters }) => this.matchesScholarFilters(filters, scholar))
      .map(({ resource, filters }) => this.formatResource(resource, filters));
  }

  async getFilterOptions() {
    const scholarRows = await database.select().from(scholars);

    return {
      programs: [...new Set(scholarRows.map((scholar) => scholar.program))].sort(),
      years: [...new Set(scholarRows.map((scholar) => scholar.year))].sort(),
      universities: [...new Set(scholarRows.map((scholar) => scholar.university))].sort(),
      locations: [
        ...new Set(scholarRows.map((scholar) => scholar.location).filter(Boolean)),
      ].sort(),
      statuses: [...new Set(scholarRows.map((scholar) => scholar.status))].sort(),
    };
  }

  private async replaceFilters(resourceId: string, filters: ResourceFilterDto[]) {
    await database.delete(resourceFilters).where(eq(resourceFilters.resourceId, resourceId));

    if (filters.length > 0) {
      await database.insert(resourceFilters).values(
        filters.map((filter) => ({
          resourceId,
          filterType: filter.filterType,
          filterValue: filter.filterValue,
        }))
      );
    }
  }

  private async getResourceFilters(resourceId: string): Promise<ResourceFilter[]> {
    const filters = await database
      .select()
      .from(resourceFilters)
      .where(eq(resourceFilters.resourceId, resourceId));

    return filters.map((filter) => ({
      type: filter.filterType,
      value: filter.filterValue,
    }));
  }

  private matchesScholarFilters(filters: ResourceFilter[], scholar: typeof scholars.$inferSelect) {
    if (filters.length === 0) return true;

    return filters.every((filter) => {
      switch (filter.type) {
        case 'program':
          return scholar.program === filter.value;
        case 'year':
          return scholar.year === filter.value;
        case 'university':
          return scholar.university === filter.value;
        case 'location':
          return scholar.location === filter.value;
        case 'status':
          return scholar.status === filter.value;
        default:
          return false;
      }
    });
  }

  private formatResource(resource: typeof resources.$inferSelect, filters: ResourceFilter[]) {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      url: resource.url,
      status: resource.status,
      filters,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}
