export type JobStatus = "pending" | "processing" | "review" | "approved" | "rejected" | "deleted";
export type PhotoStatus = "pending" | "processing" | "edited" | "approved" | "rejected" | "regenerating";
export type UserRole = "admin" | "photographer";
export type PresetName = "standard" | "bright-airy" | "luxury" | "mls-standard" | "custom";
export type TvStyle = "netflix" | "black" | "beach" | "mountains" | "fireplace" | "art" | "off";
export type SkyStyle = "blue-clouds" | "clear-blue" | "golden-hour" | "dramatic" | "overcast-soft" | "as-is";
export type SeasonalStyle = "spring" | "summer" | "autumn" | "winter" | "twilight";

export interface Job {
  id: string;
  address: string;
  photographerId: string;
  photographerName: string;
  preset: PresetName;
  tvStyle?: TvStyle;
  skyStyle?: SkyStyle;
  seasonalStyle?: SeasonalStyle | null;
  priority?: string;
  status: JobStatus;
  totalPhotos: number;
  processedPhotos: number;
  approvedPhotos: number;
  rejectedPhotos: number;
  twilightCount: number;
  cost: number;
  notes?: string | null;
  internalNotes?: string | null;
  customPromptOverride?: string | null;
  customFields?: string | null;
  clientName?: string | null;
  tags?: string;
  watermarkText?: string | null;
  watermarkPosition?: string;
  watermarkSize?: number;
  watermarkOpacity?: number;
  dropboxUrl?: string | null;
  listingDescription?: string | null;
  sequenceNumber?: number | null;
  trackedTimeSeconds?: number;
  archivedAt?: Date | string | null;
  pinnedAt?: Date | string | null;
  snoozedUntil?: Date | string | null;
  reminderAt?: Date | string | null;
  reminderNote?: string | null;
  coverPhotoId?: string | null;
  coverPhotoUrl?: string | null;
  colorLabel?: string | null;
  lockedAt?: Date | string | null;
  clientApprovalStatus?: string | null;
  clientApprovedAt?: Date | string | null;
  clientApprovalNote?: string | null;
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
  isFavorite?: boolean;
  flagged?: boolean;
  twilightInstructions: string | null;
  twilightStyle?: string | null;
  customInstructions: string | null;
  customPromptOverride?: string | null;
  detections: string[];
  qualityFlags?: string | null;
  autoTags?: string | null;
  rejectionReason?: string | null;
  note?: string | null;
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
