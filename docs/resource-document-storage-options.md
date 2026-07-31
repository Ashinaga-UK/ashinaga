# Resource Document Upload Storage Options

## Purpose

The current Resources PR adds URL-based resources for staff and scholars. Staff can create resources, publish or move them back to draft, edit metadata, delete resources, and assign visibility using audience filters. Scholars see only live resources that match their audience.

The next requirement is to support direct document uploads, not only external URLs. Uploaded documents should use the same resource workflow:

- Staff create a resource from either a URL or an uploaded file.
- Staff can publish, draft, edit, delete, and assign the resource using the same audience filters.
- Scholars can open/download the document only if they are eligible for that resource.

This document compares low-cost storage options, especially Amazon S3 and Cloudflare R2, so we can choose the simplest reliable approach with the lowest possible cost.

## Recommendation

For the lowest-cost production-ready option, Cloudflare R2 is likely the best fit.

R2 gives us S3-compatible object storage, private buckets, presigned URLs, and a generous free tier. The biggest cost advantage is that Cloudflare R2 does not charge egress fees, which matters if many scholars download the same files repeatedly.

Amazon S3 is the safest conventional choice if the team already uses AWS or expects to add other AWS services later. It is mature, well documented, and widely supported, but ongoing costs are harder to predict because storage, requests, and data transfer are billed separately.

For the current PR, I would keep URL resources as they are and add document upload as a follow-up feature using a storage provider abstraction. That lets us add either S3 or R2 without changing the staff/scholar resource workflow that already exists.

## Current PR Integration

The existing implementation already gives us most of the product behaviour we need. Document upload should extend the resource source, not create a separate module.

Suggested database changes:

```text
resources
- id
- title
- description
- type
- category
- status
- sourceType: "url" | "file"
- url: nullable
- fileKey: nullable
- fileName: nullable
- fileMimeType: nullable
- fileSizeBytes: nullable
- uploadedByStaffId: nullable
- uploadedAt: nullable
- archivedAt
- createdAt
- updatedAt
```

Existing tables and behaviour should remain:

- `resource_filters` continues to control scholar eligibility.
- Draft/live status continues to control whether scholars can see a resource.
- Staff edit/delete/publish flows should work for both URL and file resources.
- Scholar Resources UI can keep the same cards and show an `Open resource` or `Download` action depending on `sourceType`.

## Proposed Upload Flow

1. Staff opens the existing Add resource dialog.
2. Staff chooses `External URL` or `Upload document`.
3. For file upload, the frontend sends file metadata to the API: name, MIME type, size.
4. The API validates file type, size, and staff permissions.
5. The API creates a storage key, for example:

```text
resources/{resourceId}/{timestamp}-{safeFileName}
```

6. The API returns a short-lived presigned upload URL.
7. The frontend uploads the file directly to the storage provider.
8. The API saves the resource metadata and audience filters.
9. When an eligible scholar opens the resource, the API checks visibility and returns either:
   - a short-lived presigned download URL, or
   - a backend download endpoint that streams/redirects to the file.

This keeps the file private and avoids sending large files through the API server.

## S3 vs Cloudflare R2

| Area | Amazon S3 | Cloudflare R2 |
| --- | --- | --- |
| Cost model | Pay for storage, requests, retrievals where applicable, and data transfer. | Pay for storage and operations; no egress fees. |
| Free/low-cost start | AWS has free tier and credit options for new accounts, but S3 is not generally free forever. | R2 currently includes a free tier with storage and operation allowances. |
| API compatibility | Native S3 API. | S3-compatible API, so most S3 SDK flows still work. |
| Presigned URLs | Fully supported and documented. | Supported using S3-compatible presigned URLs. |
| Access control | Mature IAM, bucket policies, Block Public Access, encryption options. | Private buckets, tokens/permissions, custom domains, S3-compatible access. |
| Operational familiarity | Very common; many engineers already know it. | Simpler cost story, but team may be less familiar. |
| Egress/download cost | Can become a cost factor if many users download files. | No egress fees, which is attractive for scholar downloads. |
| Best fit | Best if we already use AWS or want maximum ecosystem maturity. | Best if we want production object storage at the lowest predictable cost. |

## Other Alternatives

### Supabase Storage

Supabase Storage can work well if the project already uses Supabase. It has a free tier, but the free storage limit is much smaller than R2. It is convenient, but it introduces another platform dependency if we are not already using Supabase.

Best for:

- Small MVP.
- Teams already using Supabase.
- Simple dashboard-managed storage.

Not ideal if:

- We expect many files or larger PDFs.
- We want S3-compatible storage without adopting Supabase.

### Firebase / Google Cloud Storage

Firebase Storage is also a reasonable managed option, especially if the project already uses Firebase. It is less compelling here unless we already rely on Firebase authentication or Google Cloud infrastructure.

Best for:

- Apps already in Firebase.
- Teams already managing Google Cloud billing and permissions.

Not ideal if:

- We only need private object storage for documents.
- We want the smallest new platform surface area.

### Google Drive or SharePoint Links

This is the cheapest short-term workaround because it can use existing organization accounts. Staff upload documents to Drive or SharePoint and paste the sharing link into the current URL resource field.

Best for:

- Immediate use without engineering upload support.
- A temporary workflow before file uploads are built.

Risks:

- Access control is split between our app and the external document platform.
- Staff may accidentally paste links with the wrong sharing permissions.
- Scholars can lose access even if the resource is live in our app.
- The resource cannot reliably enforce our audience filters once the external link is shared.

### Store Files in the GitHub Repository

This should not be used for staff-uploaded documents. It can work for static seed documents that rarely change, but GitHub is not intended to be application file storage.

Risks:

- Repository bloat.
- Poor upload/edit workflow for staff.
- Harder deletion and privacy management.
- Not suitable for user-managed content.

### Store Files in the Database

This is not recommended. Keeping binary documents in Postgres would make backups heavier, slow down database operations, and mix application metadata with large file content.

Best avoided unless there is a very specific reason.

### Store Files on the App Server Disk

This may work locally, but it is risky in production. Many hosting environments have ephemeral filesystems, meaning uploaded files can disappear on redeploy or container restart.

Best for:

- Local development only.

Not suitable for:

- Production document uploads.
- Multi-instance deployments.
- Reliable backups.

## Security Requirements

Whichever provider we choose, the implementation should follow these rules:

- Buckets must be private.
- Public bucket access should be blocked.
- Files should be accessed through short-lived signed URLs or an API-controlled download endpoint.
- The API must check scholar eligibility before returning a download URL.
- Staff upload must be permission-checked.
- File type and file size must be validated before upload.
- Storage keys should be generated by the backend, not trusted from the client.
- File names should be sanitized.
- Uploaded files should use server-side encryption where available.
- We should set billing alerts before enabling production uploads.

Optional later hardening:

- Virus/malware scanning.
- File versioning.
- Audit log for uploads/downloads/deletes.
- Lifecycle rules for deleted or archived files.
- CDN/caching if downloads become heavy.

## Cost Considerations

The main cost drivers are:

- Total storage size.
- Number of uploads.
- Number of downloads.
- Data transfer/egress, especially for S3.
- Optional CDN, malware scanning, logging, or backups.

For small document files such as PDFs, Word documents, guides, and templates, both S3 and R2 should be inexpensive. R2 is more attractive if we want to minimize surprise costs from scholar downloads because it does not charge egress fees.

Example usage to estimate:

```text
100 documents x 5 MB each = 500 MB stored
100 scholars x 10 downloads/month x 5 MB = 5 GB monthly downloads
```

With S3, the download/data transfer side needs to be checked against the selected AWS region and current pricing. With R2, the same usage is easier to reason about because egress is not billed.

## Open Questions

Before implementation, we should decide:

- Do we prefer AWS S3 for ecosystem familiarity or Cloudflare R2 for lower predictable cost?
- Who owns the cloud account and billing?
- Which region should store the files?
- What file types should be allowed? For example: PDF, DOCX, PPTX, XLSX.
- What is the maximum file size per resource?
- Should scholars view documents in browser or download them?
- When a staff member deletes a resource, should the underlying file be deleted immediately or retained for recovery?
- Do we need file versioning when staff replace a document?
- Do we need virus scanning before files become live?
- Should signed download URLs expire after 5 minutes, 15 minutes, or longer?
- Do we need an audit trail showing which staff member uploaded or replaced a file?

## Implementation Plan

### Phase 1: Basic private uploads

- Add resource `sourceType` and file metadata columns.
- Add backend config for selected provider.
- Add endpoint to create a presigned upload URL.
- Add staff UI file picker to the existing Add/Edit resource dialog.
- Save uploaded file metadata with the resource.
- Return signed download URLs only to eligible scholars.
- Keep all existing audience filters, draft/live status, edit, and delete behaviour.

### Phase 2: UX polish

- Show file name, file size, and upload status in staff UI.
- Allow staff to replace the file on an existing resource.
- Show a clearer `Download` action for file resources on the scholar page.
- Add friendly validation messages for unsupported file types or oversized files.

### Phase 3: Hardening

- Add virus scanning if required.
- Add audit logging.
- Add lifecycle rules for archived/deleted resources.
- Add file versioning if needed.
- Add monitoring and billing alerts.

## Decision Summary

Cloudflare R2 is the strongest low-cost option for this feature because it provides production-style object storage with S3-compatible APIs and no egress fees. Amazon S3 is the most established option and may be preferable if the organization already uses AWS, but it is likely to have a less predictable cost profile as downloads grow.

My recommendation is to implement document uploads behind a small storage abstraction and start with Cloudflare R2 unless the team has a strong reason to keep infrastructure inside AWS.

## References

- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/)
- [AWS S3 presigned URL documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [AWS S3 Block Public Access documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [AWS S3 encryption documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Supabase pricing](https://supabase.com/pricing)
- [Firebase pricing](https://firebase.google.com/pricing)
- [GitHub repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits)
