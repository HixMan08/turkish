import { createContext, useContext } from 'react';
import type { FaqItem, Phrase, Program, Review } from './types';
export interface Content { programs: Program[]; phrases: Phrase[]; faqs: FaqItem[]; reviews: Review[]; loading: boolean; error: string; retry: () => void; }
export const ContentContext = createContext<Content | null>(null);
export function useContent(): Content { const value = useContext(ContentContext); if (!value) throw new Error('Content provider is missing'); return value; }
