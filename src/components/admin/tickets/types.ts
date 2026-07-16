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
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
}

export interface Message {
  id: number;
  user_id?: number;
  admin_id?: number;
  message: string;
  file_url: string;
  is_admin_reply: boolean;
  created_at: string;
  edited_at?: string | null;
  user_name?: string;
  user_avatar?: string;
  admin_name?: string;
}

export interface TicketsTabProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  messages: Message[];
  reply: string;
  setReply: (reply: string) => void;
  replyFile: File | null;
  setReplyFile: (file: File | null) => void;
  handleSendReply: () => void;
  handleChangeStatus: (status: string) => void;
  handleBlockUser: (userId: number, block: boolean) => void;
  handleDeleteTicket: (ticketId: number) => void;
  loadTicketDetails: (ticketId: string, token: string) => void;
  token: string;
  adminId?: number;
  onMessagesUpdate?: (messages: Message[]) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  loading: boolean;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterServer: string;
  setFilterServer: (server: string) => void;
  filterUnread: boolean;
  setFilterUnread: (unread: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  servers: string[];
  onRefresh?: () => void;
}

export const TICKETS_API = 'https://functions.poehali.dev/887805c0-0d3a-4f32-8436-1ba1adda4a4f';
