import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { resolveAvatarSrc } from '../avatars/avatar-files';
import { AvatarsService } from '../avatars/avatars.service';
import { validateProfileImage } from '../common/profile-image';
import { database } from '../db/connection';
import { sessions, staff, users } from '../db/schema';
import { UpdateUserDto } from './dto/update-user.dto';

export interface StaffListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  isSuperAdmin: boolean;
  joinedAt: Date;
  isSelf: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly avatarsService: AvatarsService) {}

  async findById(userId: string) {
    const user = await database.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.length === 0) {
      throw new Error('User not found');
    }

    return {
      ...user[0],
      image: resolveAvatarSrc(user[0].image, userId),
    };
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.image !== undefined) {
      validateProfileImage(updateUserDto.image, userId);
    }

    const [existing] = await database.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      throw new Error('User not found');
    }

    const updateData: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

    if (updateUserDto.name !== undefined) {
      updateData.name = updateUserDto.name;
    }

    let confirmedAvatarKey: string | null | undefined;
    try {
      if (updateUserDto.image !== undefined) {
        confirmedAvatarKey = await this.avatarsService.resolveImageUpdate(
          userId,
          updateUserDto.image
        );
        updateData.image = confirmedAvatarKey;
      }

      if (Object.keys(updateData).length > 1) {
        const updatedUser = await database
          .update(users)
          .set(updateData)
          .where(eq(users.id, userId))
          .returning();

        if (!updatedUser || updatedUser.length === 0) {
          throw new Error('Failed to update user');
        }

        if (updateUserDto.image !== undefined) {
          await this.avatarsService.deleteStoredAvatar(existing.image, userId);
        }

        return {
          ...updatedUser[0],
          image: resolveAvatarSrc(updatedUser[0].image, userId),
        };
      }

      return this.findById(userId);
    } catch (error) {
      if (confirmedAvatarKey) {
        await this.avatarsService.deleteStoredAvatar(confirmedAvatarKey, userId);
      }
      throw error;
    }
  }

  async getStaffList(currentUserId?: string): Promise<StaffListItem[]> {
    const staffList = await database
      .select({
        id: staff.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: staff.role,
        isSuperAdmin: staff.isSuperAdmin,
        joinedAt: staff.createdAt,
      })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.isActive, true));

    return staffList.map((row) => ({
      ...row,
      isSelf: currentUserId ? row.userId === currentUserId : false,
    }));
  }

  async getStaffManagementView(
    currentUserId: string
  ): Promise<{ staff: StaffListItem[]; canManage: boolean }> {
    const list = await this.getStaffList(currentUserId);
    const me = list.find((row) => row.userId === currentUserId);
    return {
      staff: list,
      canManage: Boolean(me?.isSuperAdmin),
    };
  }

  async removeStaff(targetUserId: string, requesterUserId: string) {
    if (targetUserId === requesterUserId) {
      throw new BadRequestException('You cannot remove your own staff account');
    }

    const [requester] = await database
      .select()
      .from(staff)
      .where(eq(staff.userId, requesterUserId))
      .limit(1);

    if (!requester || !requester.isActive) {
      throw new ForbiddenException('Staff access required');
    }

    if (!requester.isSuperAdmin) {
      throw new ForbiddenException('Only super-admins can remove staff members');
    }

    const [target] = await database
      .select()
      .from(staff)
      .where(eq(staff.userId, targetUserId))
      .limit(1);

    if (!target) {
      throw new NotFoundException('Staff member not found');
    }

    if (!target.isActive) {
      return { success: true, alreadyInactive: true };
    }

    await database
      .update(staff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(staff.userId, targetUserId));

    try {
      await database.delete(sessions).where(eq(sessions.userId, targetUserId));
    } catch (error) {
      console.error('Failed to clear sessions for removed staff member:', error);
    }

    return { success: true, alreadyInactive: false };
  }

  async setStaffAdmin(targetUserId: string, isSuperAdmin: boolean, requesterUserId: string) {
    if (targetUserId === requesterUserId) {
      throw new BadRequestException('You cannot change your own admin access');
    }

    const [requester] = await database
      .select()
      .from(staff)
      .where(eq(staff.userId, requesterUserId))
      .limit(1);

    if (!requester || !requester.isActive) {
      throw new ForbiddenException('Staff access required');
    }

    if (!requester.isSuperAdmin) {
      throw new ForbiddenException('Only super-admins can change admin access');
    }

    return database.transaction(async (tx) => {
      // Lock the active super-admins so two concurrent demotions cannot both
      // pass the last-admin check.
      const activeSuperAdmins = await tx
        .select({ userId: staff.userId })
        .from(staff)
        .where(and(eq(staff.isActive, true), eq(staff.isSuperAdmin, true)))
        .for('update');

      const [target] = await tx
        .select()
        .from(staff)
        .where(eq(staff.userId, targetUserId))
        .for('update')
        .limit(1);

      if (!target) {
        throw new NotFoundException('Staff member not found');
      }

      if (!target.isActive) {
        throw new BadRequestException('Cannot change admin access for an inactive staff member');
      }

      if (!isSuperAdmin && target.isSuperAdmin && activeSuperAdmins.length <= 1) {
        throw new BadRequestException('Cannot remove the last super-admin');
      }

      // `is_super_admin` is the privilege; `role` only drives the Active Staff
      // badge. Keep them in step so the badge matches the shield.
      const role = isSuperAdmin ? ('admin' as const) : ('viewer' as const);
      await tx
        .update(staff)
        .set({ isSuperAdmin, role, updatedAt: new Date() })
        .where(eq(staff.userId, targetUserId));

      return { success: true, userId: targetUserId, isSuperAdmin, role };
    });
  }
}
