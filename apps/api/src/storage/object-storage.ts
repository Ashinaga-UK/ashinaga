export type ObjectHead = {
  contentType?: string;
  contentLength?: number;
};

export type PresignedUpload = {
  url: string;
  fields: Record<string, string>;
};

export abstract class ObjectStorageService {
  abstract createUploadUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds?: number;
  }): Promise<PresignedUpload>;

  abstract createDownloadUrl(input: {
    key: string;
    fileName?: string;
    expiresInSeconds?: number;
  }): Promise<string>;

  abstract headObject(key: string): Promise<ObjectHead | null>;

  abstract copyObject(sourceKey: string, destinationKey: string): Promise<void>;

  abstract deleteObject(key: string): Promise<void>;
}
