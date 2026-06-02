import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCurrentUser(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Get('staff')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get list of active staff members (minimal)' })
  @ApiResponse({ status: 200, description: 'Returns list of active staff (id, name, email)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStaffList() {
    const list = await this.usersService.getStaffList();
    return list.map(({ userId, name, email }) => ({ id: userId, name, email }));
  }

  @Get('staff/manage')
  @UseGuards(StaffGuard)
  @ApiOperation({ summary: 'Get detailed list of active staff for management' })
  @ApiResponse({ status: 200, description: 'Returns detailed staff list and caller permissions' })
  async getStaffForManagement(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.usersService.getStaffManagementView(userId);
  }

  @Delete('staff/:userId')
  @UseGuards(StaffGuard)
  @ApiOperation({ summary: 'Remove (deactivate) a staff member. Super-admin only.' })
  @ApiResponse({ status: 200, description: 'Staff member removed' })
  @ApiResponse({ status: 403, description: 'Forbidden – super-admin required' })
  async removeStaffMember(@Param('userId') targetUserId: string, @Req() req: any) {
    const requesterUserId = req.user?.id;
    if (!requesterUserId) {
      throw new Error('User not authenticated');
    }
    return this.usersService.removeStaff(targetUserId, requesterUserId);
  }
}
