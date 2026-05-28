import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
  private validateProfileImage(image: string | null | undefined) {
    if (!image) return;

    const isSupportedDataUrl = /^data:image\/(jpeg|png|webp|gif);base64,/i.test(image);
    if (!isSupportedDataUrl) {
      throw new BadRequestException('Profile image must be a JPEG, PNG, WebP, or GIF data URL');
    }

    if (image.length > 3_000_000) {
      throw new BadRequestException('Profile image must be smaller than 2MB');
    }
  }

  async findById(userId: string) {
    const user = await database.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.length === 0) {
      throw new Error('User not found');
    }

    // Return user data
    return user[0];
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const updateData: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

    if (updateUserDto.name !== undefined) {
      updateData.name = updateUserDto.name;
    }

    if (updateUserDto.image !== undefined) {
      this.validateProfileImage(updateUserDto.image);
      updateData.image = updateUserDto.image || null;
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

      return updatedUser[0];
    }

    // If no supported fields were provided, just return the existing user
    return this.findById(userId);
  }

  async getStaffList(currentUserId?: string): Promise<StaffListItem[]> {
    // Active staff with full details for management views
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

    // Verify requester is an active super-admin
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

    // Find the target staff record
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

    // Soft-delete: mark inactive
    await database
      .update(staff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(staff.userId, targetUserId));

    // Invalidate any active sessions so the removed staff can't keep using the app
    try {
      await database.delete(sessions).where(eq(sessions.userId, targetUserId));
    } catch (error) {
      console.error('Failed to clear sessions for removed staff member:', error);
    }

    return { success: true, alreadyInactive: false };
  }
}
