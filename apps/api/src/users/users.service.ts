import { BadRequestException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { database } from '../db/connection';
import { staff, users } from '../db/schema';
import { UpdateUserDto } from './dto/update-user.dto';

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

  async getStaffList(): Promise<{ id: string; name: string; email: string }[]> {
    // Get all active staff members with their user info
    const staffList = await database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.isActive, true));

    return staffList;
  }
}
