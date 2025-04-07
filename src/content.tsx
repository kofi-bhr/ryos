/**
 * This file contains all the content for the apartheidOS application in one place
 * for easy editing. You can modify text, images, videos, and other content here.
 */

export const SiteContent = {
  // Background settings
  background: {
    type: 'image', // Can be 'image', 'video', or 'color'
    source: '/public/images/wallpaper.jpg', // Path to background image or video
    color: '#1e3a8a', // Fallback color if image/video fails to load
    videoOptions: {
      loop: true,
      muted: true,
      autoplay: true,
    }
  },
  
  // General site information
  site: {
    title: 'apartheidOS',
    description: 'A retro-inspired desktop environment',
    author: 'Kofi Hairralson',
    favicon: '/public/icons/favicon.ico',
  },
  
  // Desktop icons and applications
  applications: [
    // Email app content
    {
      id: 'email',
      data: {
        emails: [
          {
            id: "1",
            threadId: "thread1",
            from: "john.doe@example.com",
            to: "jane.smith@example.com",
            subject: "Project Update",
            body: "Hi Jane,\n\nJust wanted to give you a quick update on the project. We're making good progress and should be able to meet the deadline.\n\nBest,\nJohn",
            date: "2025-04-01T10:30:00Z",
            read: true,
            starred: false,
            labels: ["work", "important"]
          },
          {
            id: "2",
            threadId: "thread1",
            from: "jane.smith@example.com",
            to: "john.doe@example.com",
            subject: "Re: Project Update",
            body: "Hi John,\n\nThanks for the update. That's great news! Let me know if you need any help from my side.\n\nRegards,\nJane",
            date: "2025-04-01T11:15:00Z",
            read: true,
            starred: false,
            labels: ["work"]
          },
          {
            id: "3",
            threadId: "thread2",
            from: "marketing@newsletter.com",
            to: "jane.smith@example.com",
            subject: "Weekly Newsletter",
            body: "Hello Jane,\n\nHere's your weekly newsletter with the latest industry news and updates.\n\n1. New product launches\n2. Market trends\n3. Upcoming events\n\nStay updated!",
            date: "2025-04-02T09:00:00Z",
            read: false,
            starred: false,
            labels: ["newsletter"]
          },
          {
            id: "4",
            threadId: "thread3",
            from: "david.wilson@example.com",
            to: "jane.smith@example.com",
            subject: "Coffee next week?",
            body: "Hey Jane,\n\nIt's been a while since we caught up. Would you be free for coffee sometime next week?\n\nDavid",
            date: "2025-04-03T14:20:00Z",
            read: true,
            starred: true,
            labels: ["personal"]
          },
          {
            id: "5",
            threadId: "thread3",
            from: "jane.smith@example.com",
            to: "david.wilson@example.com",
            subject: "Re: Coffee next week?",
            body: "Hi David,\n\nGreat to hear from you! I'd love to catch up. How about Tuesday at 3pm at the usual place?\n\nJane",
            date: "2025-04-03T15:45:00Z",
            read: true,
            starred: true,
            labels: ["personal"]
          },
          {
            id: "6",
            threadId: "thread4",
            from: "support@service.com",
            to: "jane.smith@example.com",
            subject: "Your recent inquiry",
            body: "Dear Jane,\n\nThank you for contacting our support team. We have received your inquiry and will get back to you within 24 hours.\n\nBest regards,\nCustomer Support Team",
            date: "2025-04-04T08:10:00Z",
            read: false,
            starred: false,
            labels: ["support"]
          }
        ],
        threads: [
          {
            id: "thread1",
            subject: "Project Update",
            participants: ["john.doe@example.com", "jane.smith@example.com"],
            lastMessageDate: "2025-04-01T11:15:00Z",
            messageIds: ["1", "2"],
            unread: false,
            starred: false,
            labels: ["work"]
          },
          {
            id: "thread2",
            subject: "Weekly Newsletter",
            participants: ["marketing@newsletter.com", "jane.smith@example.com"],
            lastMessageDate: "2025-04-02T09:00:00Z",
            messageIds: ["3"],
            unread: true,
            starred: false,
            labels: ["newsletter"]
          },
          {
            id: "thread3",
            subject: "Coffee next week?",
            participants: ["david.wilson@example.com", "jane.smith@example.com"],
            lastMessageDate: "2025-04-03T15:45:00Z",
            messageIds: ["4", "5"],
            unread: false,
            starred: true,
            labels: ["personal"]
          },
          {
            id: "thread4",
            subject: "Your recent inquiry",
            participants: ["support@service.com", "jane.smith@example.com"],
            lastMessageDate: "2025-04-04T08:10:00Z",
            messageIds: ["6"],
            unread: true,
            starred: false,
            labels: ["support"]
          }
        ],
        labels: [
          {
            id: "work",
            name: "Work",
            color: "#4285F4"
          },
          {
            id: "personal",
            name: "Personal",
            color: "#34A853"
          },
          {
            id: "important",
            name: "Important",
            color: "#EA4335"
          },
          {
            id: "newsletter",
            name: "Newsletter",
            color: "#FBBC05"
          },
          {
            id: "support",
            name: "Support",
            color: "#9C27B0"
          }
        ],
        user: {
          email: "jane.smith@example.com",
          name: "Jane Smith",
          signature: "\n\nBest regards,\nJane Smith\nProduct Manager"
        }
      }
    },
    
    // Video app content
    {
      id: 'videos',
      data: {
        playlist: [
          {
            id: 'video1',
            title: 'Introduction to apartheidOS',
            description: 'A brief introduction to the apartheidOS desktop environment',
            url: 'https://example.com/videos/intro.mp4',
            thumbnail: '/public/images/videos/intro-thumb.jpg',
            duration: 120 // in seconds
          },
          {
            id: 'video2',
            title: 'Tutorial: Using the Email App',
            description: 'Learn how to use the email application in apartheidOS',
            url: 'https://example.com/videos/email-tutorial.mp4',
            thumbnail: '/public/images/videos/email-thumb.jpg',
            duration: 180 // in seconds
          }
        ]
      }
    },
    
    // Chat app content
    {
      id: 'chats',
      data: {
        rooms: [
          {
            id: 'room1',
            name: 'General',
            description: 'General discussion about apartheidOS',
            messages: [
              {
                id: 'msg1',
                sender: 'system',
                content: 'Welcome to the General chat room!',
                timestamp: '2025-04-01T10:00:00Z'
              },
              {
                id: 'msg2',
                sender: 'kofi',
                content: 'Hello everyone! How are you doing today?',
                timestamp: '2025-04-01T10:05:00Z'
              },
              {
                id: 'msg3',
                sender: 'jane',
                content: 'Hi Kofi! I\'m doing great, thanks for asking.',
                timestamp: '2025-04-01T10:07:00Z'
              }
            ]
          },
          {
            id: 'room2',
            name: 'Support',
            description: 'Get help with apartheidOS',
            messages: [
              {
                id: 'msg1',
                sender: 'system',
                content: 'Welcome to the Support chat room!',
                timestamp: '2025-04-01T11:00:00Z'
              },
              {
                id: 'msg2',
                sender: 'kofi',
                content: 'I\'m having trouble with the email app. Can someone help?',
                timestamp: '2025-04-01T11:05:00Z'
              },
              {
                id: 'msg3',
                sender: 'support',
                content: 'Hi Kofi! I\'d be happy to help. What specific issue are you experiencing?',
                timestamp: '2025-04-01T11:07:00Z'
              }
            ]
          }
        ]
      }
    },
    
    // Photo app content
    {
      id: 'photos',
      data: {
        albums: [
          {
            id: 'album1',
            name: 'Vacation 2025',
            description: 'Photos from my vacation in 2025',
            cover: '/public/images/photos/vacation-cover.jpg',
            photos: [
              {
                id: 'photo1',
                title: 'Beach Sunset',
                description: 'Beautiful sunset at the beach',
                url: '/public/images/photos/beach-sunset.jpg',
                date: '2025-03-15T18:30:00Z'
              },
              {
                id: 'photo2',
                title: 'Mountain View',
                description: 'Scenic view from the mountain top',
                url: '/public/images/photos/mountain-view.jpg',
                date: '2025-03-16T10:15:00Z'
              }
            ]
          },
          {
            id: 'album2',
            name: 'Work Conference',
            description: 'Photos from the annual work conference',
            cover: '/public/images/photos/conference-cover.jpg',
            photos: [
              {
                id: 'photo1',
                title: 'Keynote Speech',
                description: 'CEO giving the keynote speech',
                url: '/public/images/photos/keynote.jpg',
                date: '2025-02-10T09:30:00Z'
              },
              {
                id: 'photo2',
                title: 'Team Lunch',
                description: 'Team lunch after the conference',
                url: '/public/images/photos/team-lunch.jpg',
                date: '2025-02-10T12:45:00Z'
              }
            ]
          }
        ]
      }
    },
    
    // Notes/TextEdit app content
    {
      id: 'textedit',
      data: {
        documents: [
          {
            id: 'doc1',
            name: 'Meeting Notes',
            content: '# Meeting Notes\n\n## Project Status\n- Frontend: 80% complete\n- Backend: 65% complete\n- Testing: 40% complete\n\n## Action Items\n- [ ] Complete API documentation\n- [ ] Fix UI bugs\n- [ ] Schedule next meeting',
            lastModified: '2025-04-02T14:30:00Z'
          },
          {
            id: 'doc2',
            name: 'Shopping List',
            content: '# Shopping List\n\n- Milk\n- Eggs\n- Bread\n- Apples\n- Coffee\n- Pasta',
            lastModified: '2025-04-03T09:15:00Z'
          }
        ]
      }
    }
  ],
  
  // System settings and preferences
  system: {
    theme: 'light', // 'light' or 'dark'
    sounds: {
      enabled: true,
      volume: 0.7,
      effects: {
        startup: '/public/sounds/startup.mp3',
        notification: '/public/sounds/notification.mp3',
        error: '/public/sounds/error.mp3'
      }
    },
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h', // '12h' or '24h'
    language: 'en-US',
  }
};

export default SiteContent;
