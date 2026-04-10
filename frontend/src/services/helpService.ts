import { api } from './api';

// --- Types ---

export interface HelpTopic {
  slug: string;
  title: string;
}

export interface HelpTopicDetail {
  slug: string;
  title: string;
  content: string; // markdown
}

// --- API calls ---

export const getHelpTopics = async (): Promise<HelpTopic[]> => {
  const response = await api.get('/help/topics');
  return response.data;
};

export const getHelpTopicBySlug = async (slug: string): Promise<HelpTopicDetail> => {
  const response = await api.get(`/help/topics/${slug}`);
  return response.data;
};
