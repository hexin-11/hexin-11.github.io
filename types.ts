export type ViewState = 'HOME' | 'NOTES' | 'HOBBIES' | 'SOCIAL' | 'GALLERY' | 'RESUME' | 'LIFE_PLAN';

export interface Profile {
  name: string;
  major: string;
  school: string;
  year: string;
  mbti: string;
  avatar: string;
  aboutMe: string;
}

export interface NoteBlock {
  id: string;
  type: 'text' | 'image' | 'code';
  content: string;
}

export interface Note {
  id: string;
  title: string;
  subtitle: string; // e.g., course code
  color: string; // Tailwind class for bg (fallback)
  customColor?: string; // Hex code for custom color
  coverImage?: string; // Data URL for custom background image
  blocks: NoteBlock[];
}

// --- New Types for Life Plan ---
export type PlanBlockType = 'text' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'table';

export interface PlanBlock {
  id: string;
  type: PlanBlockType;
  content: string; // For text/headings
  checked?: boolean; // For todo
  tableData?: string[][]; // For table: rows of cells
}

export interface LifePlan {
  id: string;
  title: string;
  date: string;
  blocks: PlanBlock[];
}

export interface TravelLog {
  id: string;
  locationName: string;
  x: number; // Percentage coordinate X on map
  y: number; // Percentage coordinate Y on map
  thoughts: string;
  attachments: Attachment[];
}
// ------------------------------

export interface Hobby {
  id: string;
  name: string;
  content: string; // Description
  images: string[];
}

export interface SocialPost {
  id: string;
  userAvatar: string;
  userName: string;
  content: string;
  images: string[];
  location?: string;
  timestamp: string;
  likes: number;
}

export interface GalleryItem {
  id: string;
  src: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'pdf';
  src: string;
  name: string;
}

export interface ResumeItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  description: string;
  attachments: Attachment[];
}

export interface ResumeSection {
  id: string;
  title: string;
  items: ResumeItem[];
}