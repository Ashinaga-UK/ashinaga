import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { database } from '../db/connection';
import { users, staff } from '../db/schema';
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
    // Start a transaction to update both tables
    await database.transaction(async (tx) => {
      // Update name in users table if provided
      if (updateUserDto.name) {
        await tx
          .update(users)
          .set({
            name: updateUserDto.name,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }

      // Update staff-specific fields in staff table
      const staffFields: any = {};
      if (updateUserDto.phone !== undefined) staffFields.phone = updateUserDto.phone;

      // Combine role (job title) and department into the department field
      // Since we don't have a separate job_title column, we store it as "JobTitle - Department"
      if (updateUserDto.role !== undefined || updateUserDto.department !== undefined) {
        const jobTitle = updateUserDto.role || '';
        const dept = updateUserDto.department || '';
        staffFields.department = jobTitle && dept ? `${jobTitle} - ${dept}` : jobTitle || dept;
      }

      if (Object.keys(staffFields).length > 0) {
        staffFields.updatedAt = new Date();

        // Check if staff record exists
        const existingStaff = await tx
          .select()
          .from(staff)
          .where(eq(staff.userId, userId))
          .limit(1);

        if (existingStaff && existingStaff.length > 0) {
          // Update existing staff record
          await tx.update(staff).set(staffFields).where(eq(staff.userId, userId));
        } else {
          // Create new staff record if it doesn't exist
          await tx.insert(staff).values({
            userId,
            ...staffFields,
          });
        }
      }
    });

    // Return updated user with staff data joined
    const updatedUser = await database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        phone: staff.phone,
        department: staff.department,
        role: staff.role,
      })
      .from(users)
      .leftJoin(staff, eq(users.id, staff.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!updatedUser || updatedUser.length === 0) {
      throw new Error('Failed to update user');
    }

    return updatedUser[0];
  }
}
