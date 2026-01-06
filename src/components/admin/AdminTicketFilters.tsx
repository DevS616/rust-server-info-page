import { Ticket } from './AdminDataLoader';

export const useTicketFilters = () => {
  const applyFilters = (
    tickets: Ticket[],
    filterStatus: string,
    filterServer: string,
    filterUnread: boolean,
    searchQuery: string,
    sortBy: string
  ): Ticket[] => {
    let filtered = [...tickets];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (filterServer !== 'all') {
      filtered = filtered.filter(t => t.server === filterServer);
    }

    if (filterUnread) {
      filtered = filtered.filter(t => t.unread_count && t.unread_count > 0);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.subject.toLowerCase().includes(query) ||
        t.steam_username.toLowerCase().includes(query) ||
        t.steam_id.includes(query)
      );
    }

    switch (sortBy) {
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'unread_desc':
        filtered.sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0));
        break;
      case 'status':
        const statusOrder: Record<string, number> = { open: 1, pending: 2, answered: 3, closed: 4 };
        filtered.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
        break;
      case 'messages_desc':
        filtered.sort((a, b) => b.message_count - a.message_count);
        break;
    }

    return filtered;
  };

  return { applyFilters };
};
