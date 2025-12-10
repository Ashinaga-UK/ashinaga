import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
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
  @ApiOperation({ summary: 'Get list of active staff members' })
  @ApiResponse({ status: 200, description: 'Returns list of active staff' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStaffList() {
    return this.usersService.getStaffList();
  }
}
