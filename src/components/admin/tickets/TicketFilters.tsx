import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

interface TicketFiltersProps {
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

const TicketFilters = ({
  filterStatus,
  setFilterStatus,
  filterServer,
  setFilterServer,
  filterUnread,
  setFilterUnread,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  servers,
  onRefresh,
}: TicketFiltersProps) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <Card className="p-3 md:p-4">
      <div className="flex flex-col gap-3 mb-3 md:mb-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs md:text-sm mb-2 block">Поиск</Label>
            <div className="relative">
              <Icon name="Search" className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 md:pl-10 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <Icon name="X" size={14} />
                </Button>
              )}
            </div>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Обновить тикеты"
            >
              <Icon name="RefreshCw" size={16} className={refreshing ? 'animate-spin' : ''} />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs md:text-sm mb-2 block">Статус</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="open">Открыт</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="closed">Закрыт</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs md:text-sm mb-2 block">Сервер</Label>
          <Select value={filterServer} onValueChange={setFilterServer}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все серверы</SelectItem>
              {servers.map(server => (
                <SelectItem key={server} value={server}>{server}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs md:text-sm mb-2 block">Сортировка</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Сначала новые</SelectItem>
              <SelectItem value="date_asc">Сначала старые</SelectItem>
              <SelectItem value="unread_desc">Больше непрочитанных</SelectItem>
              <SelectItem value="status">По статусу</SelectItem>
              <SelectItem value="messages_desc">Больше сообщений</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>
      
      <div className="mt-3 flex items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox 
            checked={filterUnread} 
            onCheckedChange={(checked) => setFilterUnread(checked === true)}
          />
          <span className="text-xs md:text-sm">Только непрочитанные</span>
        </label>
      </div>
    </Card>
  );
};

export default TicketFilters;
