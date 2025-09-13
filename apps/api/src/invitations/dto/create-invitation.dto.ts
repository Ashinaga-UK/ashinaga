import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Email address of the person to invite' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Type of user to invite',
    enum: ['staff', 'scholar'],
  })
  @IsEnum(['staff', 'scholar'])
  @IsNotEmpty()
  userType: 'staff' | 'scholar';

  @ApiPropertyOptional({
    description: 'Pre-filled scholar data (only for scholar invitations)',
    example: {
      name: 'John Doe',
      program: 'Engineering',
      year: '2024',
      university: 'MIT',
      location: 'Boston, MA',
      phone: '+1-234-567-8900',
      bio: 'Passionate about technology',
    },
  })
  @IsOptional()
  scholarData?: {
    name?: string;
    program?: string;
    year?: string;
    university?: string;
    location?: string;
    phone?: string;
    bio?: string;
  };
}

export class ResendInvitationDto {
  @ApiProperty({ description: 'ID of the invitation to resend' })
  @IsString()
  @IsNotEmpty()
  invitationId: string;
}
