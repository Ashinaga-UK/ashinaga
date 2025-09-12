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
    // Only update name in users table if provided
    if (updateUserDto.name) {
      const updatedUser = await database
        .update(users)
        .set({
          name: updateUserDto.name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        throw new Error('Failed to update user');
      }

      return updatedUser[0];
    }

    // If no name provided, just return the existing user
    return this.findById(userId);
  }
}
