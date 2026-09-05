import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AvatarsService } from '../avatars/avatars.service';
import { resolveAvatarSrc } from '../avatars/avatar-files';
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

    if (updateUserDto.image !== undefined) {
      updateData.image = await this.avatarsService.resolveImageUpdate(
        userId,
        updateUserDto.image,
        existing.image
      );
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

      return {
        ...updatedUser[0],
        image: resolveAvatarSrc(updatedUser[0].image, userId),
      };
    }

    return this.findById(userId);
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
}
