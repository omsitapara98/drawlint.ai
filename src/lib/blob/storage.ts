import {
  BlobServiceClient,
} from "@azure/storage-blob";

function getClient(): { blobService: BlobServiceClient; containerName: string } {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING environment variable is not set.",
    );
  }
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME ?? "designs";

  const blobService =
    BlobServiceClient.fromConnectionString(connectionString);
  return { blobService, containerName };
}

/**
 * Upload Excalidraw elements JSON to Azure Blob Storage.
 * Blob path: {userId}/{designId}-v{version}.json
 */
export async function uploadDesign(
  userId: string,
  designId: string,
  version: number,
  elements: unknown[],
): Promise<{ blobUrl: string; blobKey: string }> {
  const { blobService, containerName } = getClient();
  const container = blobService.getContainerClient(containerName);
  await container.createIfNotExists();

  const blobKey = `${userId}/${designId}-v${version}.json`;
  const blockBlob = container.getBlockBlobClient(blobKey);

  const content = JSON.stringify(elements);
  await blockBlob.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });

  return { blobUrl: blockBlob.url, blobKey };
}

/** Download Excalidraw elements JSON from blob storage. */
export async function downloadDesign(blobKey: string): Promise<unknown[]> {
  const { blobService, containerName } = getClient();
  const container = blobService.getContainerClient(containerName);
  const blockBlob = container.getBlockBlobClient(blobKey);

  const response = await blockBlob.download(0);
  const body = response.readableStreamBody;
  if (!body) {
    throw new Error("Empty response from blob storage.");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  return JSON.parse(raw) as unknown[];
}

/** Delete a blob by its key. */
export async function deleteDesign(blobKey: string): Promise<void> {
  const { blobService, containerName } = getClient();
  const container = blobService.getContainerClient(containerName);
  const blockBlob = container.getBlockBlobClient(blobKey);
  await blockBlob.deleteIfExists();
}
