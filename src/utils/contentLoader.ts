import { SiteContent } from '../content';

/**
 * Utility functions to load content from the centralized content file
 */

// Get content for a specific app
export const getAppContent = (appId: string) => {
  const app = SiteContent.applications.find(app => app.id === appId);
  return app?.data || null;
};

// Get email app content
export const getEmailContent = () => {
  return getAppContent('email');
};

// Get videos app content
export const getVideosContent = () => {
  return getAppContent('videos');
};

// Get chats app content
export const getChatsContent = () => {
  return getAppContent('chats');
};

// Get photos app content
export const getPhotosContent = () => {
  return getAppContent('photos');
};

// Get textedit app content
export const getTextEditContent = () => {
  return getAppContent('textedit');
};

// Get background settings
export const getBackgroundSettings = () => {
  return SiteContent.background;
};

// Get system settings
export const getSystemSettings = () => {
  return SiteContent.system;
};

// Get site information
export const getSiteInfo = () => {
  return SiteContent.site;
};

// Update content for a specific app (to be used with localStorage)
export const updateAppContent = (appId: string, newData: any) => {
  const updatedContent = { ...SiteContent };
  const appIndex = updatedContent.applications.findIndex(app => app.id === appId);
  
  if (appIndex !== -1) {
    updatedContent.applications[appIndex].data = newData;
    return updatedContent;
  }
  
  return null;
};

export default {
  getAppContent,
  getEmailContent,
  getVideosContent,
  getChatsContent,
  getPhotosContent,
  getTextEditContent,
  getBackgroundSettings,
  getSystemSettings,
  getSiteInfo,
  updateAppContent
};
