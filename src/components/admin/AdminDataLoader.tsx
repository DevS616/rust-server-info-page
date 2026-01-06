import { apiCache } from '@/utils/apiCache';

const API_BASE = 'https://functions.poehali.dev';

export interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  steam_username: string;
  steam_avatar: string;
  steam_id: string;
  is_blocked: boolean;
  message_count: number;
  unread_count?: number;
  user_id: number;
}

export interface Message {
  id: number;
  message: string;
  file_url: string;
  is_admin_reply: boolean;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  admin_name?: string;
}

export interface Server {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAdminDataLoader = () => {
  const loadTickets = async (authToken: string, useCache = true): Promise<Ticket[]> => {
    if (useCache) {
      const cached = apiCache.get<any[]>('admin_tickets');
      if (cached) {
        console.log('Using cached admin tickets:', cached.length);
        return cached;
      }
    }

    console.log('Loading admin tickets from API...');
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=list`, {
        headers: { 'X-Auth-Token': authToken }
      });
      
      console.log('Admin tickets response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Admin tickets loaded:', data);
        console.log('Tickets array:', data.tickets);
        console.log('Tickets count:', data.tickets?.length || 0);
        const ticketsArray = data.tickets || [];
        apiCache.set('admin_tickets', ticketsArray, 60000);
        return ticketsArray;
      } else {
        console.error('Failed to load admin tickets, status:', res.status);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        return [];
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
      return [];
    }
  };

  const loadServers = async (authToken: string, useCache = true): Promise<Server[]> => {
    if (useCache) {
      const cached = apiCache.get<any[]>('admin_servers');
      if (cached) {
        return cached;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/`, {
        headers: { 'X-Auth-Token': authToken }
      });
      
      if (res.ok) {
        const data = await res.json();
        const serversArray = data.servers || [];
        apiCache.set('admin_servers', serversArray, 300000);
        return serversArray;
      }
      return [];
    } catch (error) {
      console.error('Failed to load servers:', error);
      return [];
    }
  };

  const loadTicketDetails = async (ticketId: string, authToken: string): Promise<{ ticket: Ticket | null; messages: Message[] }> => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?ticket_id=${ticketId}`, {
        headers: { 'X-Auth-Token': authToken }
      });
      
      if (res.ok) {
        const data = await res.json();
        return {
          ticket: data.ticket,
          messages: data.messages || []
        };
      }
      return { ticket: null, messages: [] };
    } catch (error) {
      console.error('Failed to load ticket details:', error);
      return { ticket: null, messages: [] };
    }
  };

  return {
    loadTickets,
    loadServers,
    loadTicketDetails
  };
};
