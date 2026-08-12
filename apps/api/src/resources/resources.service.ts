import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { normalizeAudienceFilters } from '../common/audience-filters/audience-filter';
import { buildResourceAudienceVisibilitySql } from '../common/audience-filters/audience-filter.sql';
import { getScholarAudienceFilterOptions } from '../common/audience-filters/audience-filter-options';
import { database } from '../db/connection';
import { resourceFilters, resources, scholars } from '../db/schema';
import { CreateResourceDto, ResourceFilterDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

type ResourceFilter = {
  type: string;
  value: string;
};

type ResourceFilterWriter = Pick<typeof database, 'delete' | 'insert'>;

@Injectable()
export class ResourcesService {
  async createResource(dto: CreateResourceDto, userId: string) {
    const { filters: rawFilters, ...resourceData } = dto;
    const filters = normalizeAudienceFilters(rawFilters ?? []);

    const resource = await database.transaction(async (tx) => {
      const [created] = await tx
        .insert(resources)
        .values({
          ...resourceData,
          status: resourceData.status ?? 'draft',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      await this.replaceFilters(created.id, filters, tx);
      return created;
    });

    return this.formatResource(resource, this.formatFilters(filters));
  }

  async listResources() {
    const rows = await database
      .select()
      .from(resources)
      .where(eq(resources.archived, false))
      .orderBy(asc(resources.title));

    const filtersByResourceId = await this.getResourceFiltersByResourceIds(
      rows.map((resource) => resource.id)
    );

    return rows.map((resource) =>
      this.formatResource(resource, filtersByResourceId.get(resource.id) ?? [])
    );
  }

  async updateResource(resourceId: string, dto: UpdateResourceDto, userId: string) {
    const { filters: rawFilters, ...resourceData } = dto;
    const filters =
      rawFilters === undefined ? undefined : normalizeAudienceFilters(rawFilters ?? []);
    const updated = await database.transaction(async (tx) => {
      const [resource] = await tx
        .update(resources)
        .set({
          ...resourceData,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(and(eq(resources.id, resourceId), eq(resources.archived, false)))
        .returning();

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      if (filters !== undefined) {
        await this.replaceFilters(resourceId, filters, tx);
      }

      return resource;
    });

    const nextFilters =
      filters !== undefined
        ? this.formatFilters(filters)
        : await this.getResourceFilters(resourceId);
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
      .select({
        program: scholars.program,
        year: scholars.year,
        university: scholars.university,
        location: scholars.location,
        status: scholars.status,
      })
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholarRows[0]) {
      return [];
    }

    const scholar = scholarRows[0];
    const visibleResources = await database
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.status, 'live'),
          eq(resources.archived, false),
          buildResourceAudienceVisibilitySql(scholar)
        )
      )
      .orderBy(asc(resources.title));

    const filtersByResourceId = await this.getResourceFiltersByResourceIds(
      visibleResources.map((resource) => resource.id)
    );

    return visibleResources.map((resource) =>
      this.formatResource(resource, filtersByResourceId.get(resource.id) ?? [])
    );
  }

  async getFilterOptions() {
    return getScholarAudienceFilterOptions();
  }

  private async replaceFilters(
    resourceId: string,
    filters: ResourceFilterDto[],
    db: ResourceFilterWriter = database
  ) {
    await db.delete(resourceFilters).where(eq(resourceFilters.resourceId, resourceId));

    if (filters.length > 0) {
      await db.insert(resourceFilters).values(
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

  private async getResourceFiltersByResourceIds(resourceIds: string[]) {
    const filtersByResourceId = new Map<string, ResourceFilter[]>();
    if (resourceIds.length === 0) return filtersByResourceId;

    const filters = await database
      .select()
      .from(resourceFilters)
      .where(inArray(resourceFilters.resourceId, resourceIds));

    for (const filter of filters) {
      const resourceFiltersForId = filtersByResourceId.get(filter.resourceId) ?? [];
      resourceFiltersForId.push({
        type: filter.filterType,
        value: filter.filterValue,
      });
      filtersByResourceId.set(filter.resourceId, resourceFiltersForId);
    }

    return filtersByResourceId;
  }

  private formatFilters(filters: ResourceFilterDto[]): ResourceFilter[] {
    return filters.map((filter) => ({
      type: filter.filterType,
      value: filter.filterValue,
    }));
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
