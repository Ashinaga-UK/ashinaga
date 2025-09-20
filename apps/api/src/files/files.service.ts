import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../db/connection';
import { requestAttachments, requests, scholars, users } from '../db/schema';

@Injectable()
export class FilesService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'eu-west-3');
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', '');

    this.s3Client = new S3Client({
      region,
      // In production, App Runner will use instance role automatically
      // In development, use local AWS credentials
    });
  }

  /**
   * Generate a pre-signed URL for uploading a file
   */
  async getUploadUrl(
    userId: string,
    fileName: string,
    fileType: string,
    fileSize: number
  ): Promise<{ uploadUrl: string; fileKey: string; fileId: string }> {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (fileSize > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Get scholar ID from user ID
    const scholar = await database
      .select()
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholar || scholar.length === 0) {
      throw new NotFoundException('Scholar not found for this user');
    }

    const scholarId = scholar[0].id;

    // Generate unique file ID and key
    const fileId = uuidv4();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${scholarId}/requests/temp/${timestamp}-${fileId}-${sanitizedFileName}`;

    // Generate pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: fileType,
      // Add metadata
      Metadata: {
        scholarId,
        userId,
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    return {
      uploadUrl,
      fileKey,
      fileId,
    };
  }

  /**
   * Confirm a file upload and move it to the permanent location
   */
  async confirmUpload(
    userId: string,
    fileId: string,
    fileKey: string,
    requestId: string,
    fileName: string,
    fileSize: string,
    mimeType: string
  ): Promise<{ attachmentId: string }> {
    // Import tasks from schema
    const { tasks } = await import('../db/schema/tasks');

    // Verify the request belongs to the user's scholar profile
    const scholar = await database
      .select()
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholar || scholar.length === 0) {
      throw new NotFoundException('Scholar not found for this user');
    }

    const scholarId = scholar[0].id;

    // Check if this is a task upload by trying to find a task with this ID
    const task = await database.select().from(tasks).where(eq(tasks.id, requestId)).limit(1);

    if (task && task.length > 0) {
      // This is a task upload, verify it belongs to this scholar
      if (task[0].scholarId !== scholarId) {
        throw new NotFoundException('Task not found or does not belong to this scholar');
      }

      // For tasks, we'll store the file but return it as an attachment ID
      // The task completion endpoint will handle linking it to the task response
      return {
        attachmentId: fileId,
      };
    } else {
      // This is a request upload, proceed with original logic
      const request = await database
        .select()
        .from(requests)
        .where(eq(requests.id, requestId))
        .limit(1);

      if (!request || request.length === 0 || request[0].scholarId !== scholarId) {
        throw new NotFoundException('Request not found or does not belong to this scholar');
      }

      // Store attachment metadata in database for requests
      const [attachment] = await database
        .insert(requestAttachments)
        .values({
          id: fileId,
          requestId,
          name: fileName,
          size: fileSize,
          url: fileKey, // Store the S3 key
          mimeType,
        })
        .returning();

      return {
        attachmentId: attachment.id,
      };
    }
  }

  /**
   * Generate a pre-signed URL for downloading a file
   */
  async getDownloadUrl(userId: string, attachmentId: string): Promise<{ downloadUrl: string }> {
    // Get the attachment
    const attachment = await database
      .select({
        attachment: requestAttachments,
        request: requests,
      })
      .from(requestAttachments)
      .innerJoin(requests, eq(requestAttachments.requestId, requests.id))
      .where(eq(requestAttachments.id, attachmentId))
      .limit(1);

    if (!attachment || attachment.length === 0) {
      throw new NotFoundException('Attachment not found');
    }

    // Get the user to check permissions
    const user = await database.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.length === 0) {
      throw new NotFoundException('User not found');
    }

    const isStaff = user[0].userType === 'staff';

    // Staff can download any attachment
    if (!isStaff) {
      // For non-staff (scholars), verify they own the request
      const scholar = await database
        .select()
        .from(scholars)
        .where(eq(scholars.userId, userId))
        .limit(1);

      if (!scholar || scholar.length === 0) {
        throw new NotFoundException('Scholar not found for this user');
      }

      const isOwner = attachment[0].request.scholarId === scholar[0].id;
      if (!isOwner) {
        throw new Error('You do not have permission to access this file');
      }
    }

    // Generate pre-signed URL for download
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: attachment[0].attachment.url, // The S3 key is stored in the url field
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return {
      downloadUrl,
    };
  }

  /**
   * Delete a file from S3 and database
   */
  async deleteFile(userId: string, attachmentId: string): Promise<void> {
    // Get the attachment
    const attachment = await database
      .select({
        attachment: requestAttachments,
        request: requests,
      })
      .from(requestAttachments)
      .innerJoin(requests, eq(requestAttachments.requestId, requests.id))
      .where(eq(requestAttachments.id, attachmentId))
      .limit(1);

    if (!attachment || attachment.length === 0) {
      throw new NotFoundException('Attachment not found');
    }

    // Verify the user has permission to delete
    const scholar = await database
      .select()
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholar || scholar.length === 0) {
      throw new NotFoundException('Scholar not found for this user');
    }

    const isOwner = attachment[0].request.scholarId === scholar[0].id;
    if (!isOwner) {
      throw new Error('You do not have permission to delete this file');
    }

    // Delete from S3
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: attachment[0].attachment.url,
    });

    await this.s3Client.send(command);

    // Delete from database
    await database.delete(requestAttachments).where(eq(requestAttachments.id, attachmentId));
  }
}
