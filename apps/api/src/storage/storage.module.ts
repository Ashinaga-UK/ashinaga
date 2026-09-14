import { Module } from '@nestjs/common';
import { ObjectStorageService } from './object-storage';
import { S3ObjectStorageService } from './s3-object-storage.service';

@Module({
  providers: [
    {
      provide: ObjectStorageService,
      useClass: S3ObjectStorageService,
    },
  ],
  exports: [ObjectStorageService],
})
export class StorageModule {}
