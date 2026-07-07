export interface UserProfile {
  uid: string;
  username: string;
  usernameLower: string;
  email?: string; // Optional: Only available for owner via private subcollection
  bio?: string;
  profilePic?: string;
  followersCount: number;
  followingCount: number;
  garage: string[]; // List of car IDs
  partnerId?: string; // UID of their partner
}

export type MediaType = 'image';

export interface Post {
  id: string;
  authorId: string;
  caption: string;
  carTagId?: string;
  isModUpdate?: boolean; // New: indicates if this post is a modification update
  mediaUrl?: string; // Legacy support
  mediaUrls: string[];
  mediaType: MediaType;
  thumbnailUrl?: string;
  likesCount: number;
  commentsCount: number;
  viewCount?: number;
  views?: string[];
  isDuo?: boolean;
  songId?: string; // Optional track ID attached to the post
  createdAt: number;
}

export type CarStage = "Stock" | "Stage 1" | "Stage 2" | "Stage 3" | "Track Ready" | "Show Car";

export interface BuildLogEntry {
  id: string;
  title: string;
  description: string;
  date: number;
  type: 'modification' | 'repair' | 'maintenance' | 'dyno' | 'track_day' | 'performance_verification';
  postId?: string; // Optional link to a post
  mediaUrl?: string; // Optional image of the update
  cost?: number; // Optional part cost
  laborCost?: number; // Optional labor cost
  supplier?: string; // Sourced from / brand
  installedBy?: string; // DIY or shop name
}

export interface PerformanceRecord {
  id: string;
  carId: string;
  ownerId: string;
  ownerUsername: string;
  carMake: string;
  carModel: string;
  horsepower?: number;
  torque?: number;
  quarterMileTime?: number;
  proofUrl: string;
  createdAt: number;
}

export interface Car {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  mods: string;
  stage: CarStage;
  coverImage?: string;
  buildTimeline?: BuildLogEntry[]; // New: chronological build log
  createdAt: number;
}

export interface Comment {
  id: string;
  authorId: string;
  postId: string;
  text: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string; // The owner of the notification
  actorId: string; // The user who triggered the notification
  type: 'like' | 'comment' | 'follow' | 'message' | 'tag';
  postId?: string; // For like or comment or tag
  message?: string; // Optional message
  read: boolean;
  createdAt: number;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageAt?: number;
  lastSenderId?: string;
}

export interface Story {
  id: string;
  authorId: string;
  mediaUrl: string;
  mediaType: MediaType;
  createdAt: number;
  reactions?: Record<string, string>; // userId -> emoji
  views?: string[]; // list of userIds
  songId?: string; // Optional track ID (serialized JSON) attached to the story
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: number;
}
