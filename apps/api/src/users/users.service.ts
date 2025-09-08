import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { database } from '../db/connection';
import { users } from '../db/schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  async findById(userId: string) {
    const user = await database.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.length === 0) {
      throw new Error('User not found');
    }

    // Return user data
    return user[0];
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    // Only update fields that are provided
    const updateData: any = {};

    if (updateUserDto.name !== undefined) {
      updateData.name = updateUserDto.name;
    }

    // Store additional fields in a properties JSON column if it exists
    // For now, we'll store phone, role, department in the user record if those columns exist
    // Otherwise we can extend the schema later

    const updatedUser = await database
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      throw new Error('Failed to update user');
    }

    // Return updated user data
    return updatedUser[0];
  }
}
