/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: 'active' | 'away' | 'offline';
  leads: number; // Lead assignments count
  responseTime: number; // Avg response time in minutes
  conversionRate: number; // Conversion percentage
  activeChats: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: 'inbound_lead' | 'manual_campaign' | 'whatsapp_keyword' | 'property_inquiry';
  routingRule: 'round_robin' | 'least_busy' | 'all_active';
  agents: string[]; // List of agent IDs
  status: 'active' | 'paused';
}

export interface Client {
  id: string;
  name: string;
  domain: string;
  logo: string;
  workflows: Workflow[];
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'sending' | 'paused' | 'completed' | 'scheduled';
  templateId: string;
  messageText: string;
  mediaUrl?: string;
  mediaName?: string;
  createdAt: string;
  delayMin: number; // Min delay between messages in seconds
  delayMax: number; // Max delay between messages in seconds
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  recipients: Recipient[];
  scheduledAt?: string; // Date/Time when the campaign is scheduled to initiate
}

export interface Recipient {
  id: string;
  phone: string;
  name: string;
  property: string;
  price?: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt?: string;
}

export interface Message {
  id: string;
  campaignId?: string;
  chatId: string;
  sender: 'agent' | 'customer' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
}

export interface ChatThread {
  id: string;
  customerName: string;
  customerPhone: string;
  agentId?: string;
  workflowId?: string;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface PropertyClientRecord {
  id: string;
  name: string;
  phone: string;
  propertyInterest: string; // e.g. 'Mivida Apartment', 'Townhouse #12', etc.
  status: 'New Lead' | 'WhatsApp Contacted' | 'Tour Arranged' | 'Under Offer' | 'Closed Sold' | 'No Answer';
  lastActivity: string; // e.g. "Chat Started", "Last sent 12:47 PM", etc.
  assignedAgent?: string; // name
  notes?: string;
  updatedAt: string;
}

export interface PropertyFinderListing {
  id: string;
  reference: string;
  title: string;
  description: string;
  type: string;
  category: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  locationId: number;
  locationName: string;
  images: string[];
  status: 'draft' | 'live' | 'unpublished';
  updatedAt: string;
}

export interface PropertyFinderLead {
  id: string;
  entityType: 'listing' | 'project' | 'developer' | 'agent' | 'company';
  channel: 'whatsapp' | 'email' | 'call';
  status: 'sent' | 'delivered' | 'read' | 'replied';
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  listingId?: string;
  listingReference?: string;
  propertyInterest: string;
  createdAt: string;
  imported: boolean;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  phone: string;
  name: string;
  status: 'Matched & Updated' | 'New Lead Synced';
  details: string;
}

