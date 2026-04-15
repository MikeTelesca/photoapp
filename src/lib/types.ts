export type JobStatus = "pending" | "processing" | "review" | "approved" | "rejected" | "deleted";
export type PhotoStatus = "pending" | "processing" | "edited" | "approved" | "rejected" | "regenerating";
export type UserRole = "admin" | "photographer";
export type PresetName = "standard" | "bright-airy" | "luxury" | "custom";

export interface Job {
  id: string;
  address: string;
  photographerId: string;
  photographerName: string;
  preset: PresetName;
  status: JobStatus;
  totalPhotos: number;
  processedPhotos: number;
  approvedPhotos: number;
  rejectedPhotos: number;
  twilightCount: number;
  cost: number;
  notes?: string | null;
  clientName?: string | null;
  tags?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  jobId: string;
  orderIndex: number;
  status: PhotoStatus;
  originalUrl: string;
  editedUrl: string | null;
  isExterior: boolean;
  isTwilight: boolean;
  twilightInstructions: string | null;
  customInstructions: string | null;
  detections: string[];
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

export interface Preset {
  id: string;
  name: string;
  slug: PresetName;
  description: string;
  promptModifiers: string;
}
