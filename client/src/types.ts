export type LanguageId = 'turkish' | 'kazakh' | 'russian';
export interface Program { id: string; language: LanguageId; title: string; nativeName: string; greeting: string; description: string; levels: string[]; topics: string[]; price: number | null; isActive: boolean; sortOrder: number; }
export interface Phrase { id: string; turkish: string; transcription: string; translation: string; category: string; }
export interface FaqItem { id: string; question: string; answer: string; sortOrder: number; }
export interface Review { id: string; authorName: string; text: string; rating: number; isPublished: boolean; createdAt: string; }
export interface Application { id: string; name: string; phone: string; email: string | null; language: LanguageId; level: string; preferredFormat: 'online' | 'offline'; message: string; status: 'new' | 'contacted' | 'enrolled' | 'rejected'; source: string; consentGivenAt: string; consentVersion: string; createdAt: string; }
export interface AdminUser { id: string; email: string; role: 'admin' | 'editor'; }
export interface AuthSession { user: AdminUser; csrfToken: string; }
export interface Paginated<T> { data: T[]; pagination: { page: number; pageSize: number; total: number; pages: number }; }
