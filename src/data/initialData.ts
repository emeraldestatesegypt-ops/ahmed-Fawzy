/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Agent, Campaign, ChatThread, PropertyClientRecord, SyncLog } from '../types';

export const INITIAL_SYNC_LOGS: SyncLog[] = [
  {
    id: 'slog-1',
    timestamp: new Date(Date.now() - 30 * 60 * 1050).toLocaleString(),
    phone: '+20101234567',
    name: 'Sherif Aly',
    status: 'Matched & Updated',
    details: 'Status updated to WhatsApp Contacted; activity set to "Last message: \'Can you send photos of Villes #402?\'"'
  },
  {
    id: 'slog-2',
    timestamp: new Date(Date.now() - 10 * 60 * 1050).toLocaleString(),
    phone: '+20111987654',
    name: 'Omar Farouk',
    status: 'Matched & Updated',
    details: 'Mapped inquiry: "That seems nice. Is there a payment plan up to 8 years?"'
  }
];

export const INITIAL_PROPERTY_CLIENTS: PropertyClientRecord[] = [
  {
    id: 'pc-1',
    name: 'Sherif Aly',
    phone: '+20101234567',
    propertyInterest: 'Villes #402',
    status: 'New Lead',
    lastActivity: 'Not contacted',
    assignedAgent: 'Ahmed Fawzy',
    notes: 'Inquired about townhouses launching today. Interested in direct cash offer options description.',
    updatedAt: new Date(Date.now() - 48 * 3600 * 1000).toLocaleString()
  },
  {
    id: 'pc-2',
    name: 'Omar Farouk',
    phone: '+20111987654',
    propertyInterest: 'Townhouse #12',
    status: 'New Lead',
    lastActivity: 'Not contacted',
    assignedAgent: 'Ahmed Fawzy',
    notes: 'Requested flexible payment plans. Looking for 8-year installments.',
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toLocaleString()
  },
  {
    id: 'pc-3',
    name: 'Hossam Nagy',
    phone: '+20104321098',
    propertyInterest: 'Maadi Heights (Rental)',
    status: 'New Lead',
    lastActivity: 'Not contacted',
    assignedAgent: 'Sarah Malik',
    notes: 'Looking for prompt rental. Tour tentatively arranged.',
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toLocaleString()
  }
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'a1',
    name: 'Ahmed Fawzy',
    email: 'ahmed@sierra-estates.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    role: 'Senior Sales Agent',
    status: 'active',
    leads: 219,
    responseTime: 8, // Outstanding speed
    conversionRate: 24,
    activeChats: 15
  },
  {
    id: 'a2',
    name: 'Sarah Malik',
    email: 'sarah.m@easylisting.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    role: 'Leads Specialist',
    status: 'active',
    leads: 147,
    responseTime: 18, // Above critical threshholder (>15 mins)
    conversionRate: 15,
    activeChats: 9
  },
  {
    id: 'a3',
    name: 'John Doe',
    email: 'john.d@sierra-estates.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    role: 'Property Consultant',
    status: 'active',
    leads: 112,
    responseTime: 11,
    conversionRate: 18,
    activeChats: 8
  },
  {
    id: 'a4',
    name: 'Maria Garcia',
    email: 'maria.g@easylisting.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    role: 'Customer Support',
    status: 'away',
    leads: 64,
    responseTime: 22, // Heavy warning (>15 mins)
    conversionRate: 11,
    activeChats: 2
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Sierra Estates',
    domain: 'sierra-estates.com',
    logo: '🏢',
    workflows: [
      {
        id: 'w1',
        name: 'WhatsApp VIP Outreach',
        description: 'Automatic high-priority outreach when user views villa units.',
        triggerType: 'property_inquiry',
        routingRule: 'round_robin',
        agents: ['a1', 'a3'],
        status: 'active'
      },
      {
        id: 'w2',
        name: 'Portal Follow-Up',
        description: 'Triggered when property portal inquiries are received.',
        triggerType: 'inbound_lead',
        routingRule: 'least_busy',
        agents: ['a1', 'a2', 'a3'],
        status: 'active'
      }
    ]
  },
  {
    id: 'c2',
    name: 'Easylisting',
    domain: 'easylisting.co',
    logo: '🏷️',
    workflows: [
      {
        id: 'w3',
        name: 'WhatsApp Bulk Blast',
        description: 'Campaign workflow linked directly to WhatsApp bulk sender.',
        triggerType: 'manual_campaign',
        routingRule: 'all_active',
        agents: ['a1', 'a2', 'a4'],
        status: 'active'
      },
      {
        id: 'w4',
        name: 'Keyword Auto-Responder',
        description: 'Auto-starts when buyer types keywords like "price" or "location".',
        triggerType: 'whatsapp_keyword',
        routingRule: 'least_busy',
        agents: ['a2', 'a4'],
        status: 'active'
      }
    ]
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Sierra Estates launch - Villa Blast',
    status: 'completed',
    templateId: 'temp_launch',
    messageText: 'Hello {{Name}}! Hope you are doing great. This is Ahmed from Sierra Estates. We are launching premium townhouse units in Sierra Estates today. Prices starting from $340,000 for {{Property}} with a 10% downpayment. Reply "INFO" for brochure.',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    delayMin: 2,
    delayMax: 5,
    totalRecipients: 4,
    sentCount: 4,
    failedCount: 0,
    recipients: [
      { id: 'r1', phone: '+20101234567', name: 'Sherif Aly', property: 'Villes #402', price: '$450k', status: 'sent', sentAt: '12:45 PM' },
      { id: 'r2', phone: '+20111987654', name: 'Omar Farouk', property: 'Townhouse #12', price: '$340k', status: 'sent', sentAt: '12:46 PM' },
      { id: 'r3', phone: '+20121776554', name: 'Tarek Hegazi', property: 'Apartment B4', price: '$220k', status: 'sent', sentAt: '12:48 PM' },
      { id: 'r4', phone: '+20155234123', name: 'Mostafa Kamel', property: 'Villa #11', price: '$590k', status: 'sent', sentAt: '12:50 PM' }
    ]
  },
  {
    id: 'camp-2',
    name: 'Easylisting Rental Follow-Up',
    status: 'completed',
    templateId: 'temp_rental',
    messageText: 'Hi {{Name}}, are you still looking for rental units in {{Property}}? We have 3 new listings listed today at {{Price}}. Let me know when we can jump on a quick WhatsApp call.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    delayMin: 1,
    delayMax: 3,
    totalRecipients: 3,
    sentCount: 2,
    failedCount: 1,
    recipients: [
      { id: 'r5', phone: '+20104321098', name: 'Hossam Nagy', property: 'Maadi Heights', price: '$1.2k/mo', status: 'sent', sentAt: '03:10 PM' },
      { id: 'r6', phone: '+20106123456', name: 'Youssef Wali', property: 'New Cairo Apt', price: '$800/mo', status: 'sent', sentAt: '03:11 PM' },
      { id: 'r7', phone: 'invalid-phone-num', name: 'Karim Eid', property: 'Zamalek Studio', price: '$1.5k/mo', status: 'failed', errorMessage: 'Invalid WhatsApp format', sentAt: '03:12 PM' }
    ]
  }
];

export const INITIAL_CHATS: ChatThread[] = [
  {
    id: 'chat-1',
    customerName: 'Sherif Aly',
    customerPhone: '+20101234567',
    agentId: 'a1',
    workflowId: 'w1',
    lastMessageText: 'Can you send photos of Villes #402?',
    lastMessageTime: '12:47 PM',
    unreadCount: 1,
    messages: [
      { id: 'm1', chatId: 'chat-1', sender: 'system', senderName: 'WhatsApp Bulk Bot', text: 'Campaign message launched: Hello Sherif Aly! Hope you are doing great. This is Ahmed from Sierra Estates. We are launching premium townhouse units in Sierra Estates today. Prices starting from $340,000 for Villes #402 with a 10% downpayment. Reply "INFO" for brochure.', timestamp: '12:45 PM', status: 'read' },
      { id: 'm2', chatId: 'chat-1', sender: 'customer', senderName: 'Sherif Aly', text: 'INFO', timestamp: '12:46 PM', status: 'read' },
      { id: 'm3', chatId: 'chat-1', sender: 'agent', senderName: 'Ahmed Fawzy', text: 'Hello Sherif! Ahmed here. Absolutely, I have sent the brochure to your email. I can also send details here. Would you like a 3D tour link?', timestamp: '12:46 PM', status: 'read' },
      { id: 'm4', chatId: 'chat-1', sender: 'customer', senderName: 'Sherif Aly', text: 'Can you send photos of Villes #402?', timestamp: '12:47 PM', status: 'pending' }
    ]
  },
  {
    id: 'chat-2',
    customerName: 'Omar Farouk',
    customerPhone: '+20111987654',
    agentId: 'a1',
    workflowId: 'w3',
    lastMessageText: 'That seems nice. Is there a payment plan up to 8 years?',
    lastMessageTime: '01:05 PM',
    unreadCount: 0,
    messages: [
      { id: 'm5', chatId: 'chat-2', sender: 'system', senderName: 'WhatsApp Bulk Bot', text: 'Campaign message launched: Hello Omar Farouk! Hope you are doing great. This is Ahmed from Sierra Estates. We are launching premium townhouse units...', timestamp: '12:46 PM', status: 'read' },
      { id: 'm6', chatId: 'chat-2', sender: 'customer', senderName: 'Omar Farouk', text: 'Thanks. Do you have payment plans?', timestamp: '12:55 PM', status: 'read' },
      { id: 'm7', chatId: 'chat-2', sender: 'agent', senderName: 'Ahmed Fawzy', text: 'Yes, we have plans up to 7 years. Let me check if we can extend to 8 years for Townhouse #12.', timestamp: '12:58 PM', status: 'read' },
      { id: 'm8', chatId: 'chat-2', sender: 'customer', senderName: 'Omar Farouk', text: 'That seems nice. Is there a payment plan up to 8 years?', timestamp: '01:05 PM', status: 'read' }
    ]
  },
  {
    id: 'chat-3',
    customerName: 'Hossam Nagy',
    customerPhone: '+20104321098',
    agentId: 'a2',
    workflowId: 'w3',
    lastMessageText: 'Great, thanks.',
    lastMessageTime: '03:15 PM',
    unreadCount: 0,
    messages: [
      { id: 'm9', chatId: 'chat-3', sender: 'system', senderName: 'WhatsApp Bulk Bot', text: 'Hi Hossam Nagy, are you still looking for rental units...', timestamp: '03:10 PM', status: 'read' },
      { id: 'm10', chatId: 'chat-3', sender: 'customer', senderName: 'Hossam Nagy', text: 'Yes, I am interested in Maadi Heights rental.', timestamp: '03:12 PM', status: 'read' },
      { id: 'm11', chatId: 'chat-3', sender: 'agent', senderName: 'Sarah Malik', text: 'Perfect! The unit is on the 4th floor, 3 bedrooms, asking $1,200/mo. I can schedule a tour tomorrow at 5 PM.', timestamp: '03:14 PM', status: 'read' },
      { id: 'm12', chatId: 'chat-3', sender: 'customer', senderName: 'Hossam Nagy', text: 'Great, thanks.', timestamp: '03:15 PM', status: 'read' }
    ]
  }
];

export function getStorageData() {
  const agents = localStorage.getItem('wasender_agents');
  const clients = localStorage.getItem('wasender_clients');
  const campaigns = localStorage.getItem('wasender_campaigns');
  const chats = localStorage.getItem('wasender_chats');
  const propertyClients = localStorage.getItem('wasender_property_clients');
  const syncLogs = localStorage.getItem('wasender_sync_history');

  return {
    agents: agents ? JSON.parse(agents) : INITIAL_AGENTS,
    clients: clients ? JSON.parse(clients) : INITIAL_CLIENTS,
    campaigns: campaigns ? JSON.parse(campaigns) : INITIAL_CAMPAIGNS,
    chats: chats ? JSON.parse(chats) : INITIAL_CHATS,
    propertyClients: propertyClients ? JSON.parse(propertyClients) : INITIAL_PROPERTY_CLIENTS,
    syncLogs: syncLogs ? JSON.parse(syncLogs) : INITIAL_SYNC_LOGS,
  };
}

export function saveStorageData(data: {
  agents?: Agent[];
  clients?: Client[];
  campaigns?: Campaign[];
  chats?: ChatThread[];
  propertyClients?: PropertyClientRecord[];
  syncLogs?: SyncLog[];
}) {
  if (data.agents) localStorage.setItem('wasender_agents', JSON.stringify(data.agents));
  if (data.clients) localStorage.setItem('wasender_clients', JSON.stringify(data.clients));
  if (data.campaigns) localStorage.setItem('wasender_campaigns', JSON.stringify(data.campaigns));
  if (data.chats) localStorage.setItem('wasender_chats', JSON.stringify(data.chats));
  if (data.propertyClients) localStorage.setItem('wasender_property_clients', JSON.stringify(data.propertyClients));
  if (data.syncLogs) localStorage.setItem('wasender_sync_history', JSON.stringify(data.syncLogs));
}
