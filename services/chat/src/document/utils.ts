import path from "node:path";

export function getUploadDir() {
  return path.join(process.cwd(), 'uploads');
}

export function getUploadUserPrefix(userId: string) {
  return path.join(getUploadDir(), userId);
}