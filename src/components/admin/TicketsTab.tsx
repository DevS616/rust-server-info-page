import { TicketsTabProps } from './tickets/types';
import TicketDetail from './tickets/TicketDetail';
import TicketFilters from './tickets/TicketFilters';
import TicketList from './tickets/TicketList';
import PurgeButton from './PurgeButton';

const TicketsTab = ({
  tickets,
  selectedTicket,
  setSelectedTicket,
  messages,
  reply,
  setReply,
  replyFile,
  setReplyFile,
  handleSendReply,
  handleChangeStatus,
  handleBlockUser,
  handleDeleteTicket,
  loadTicketDetails,
  token,
  onMessagesUpdate,
  getStatusColor,
  getStatusText,
  loading,
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
  onRefresh
}: TicketsTabProps) => {
  if (selectedTicket) {
    return (
      <TicketDetail
        selectedTicket={selectedTicket}
        setSelectedTicket={setSelectedTicket}
        messages={messages}
        reply={reply}
        setReply={setReply}
        replyFile={replyFile}
        setReplyFile={setReplyFile}
        handleSendReply={handleSendReply}
        handleChangeStatus={handleChangeStatus}
        handleBlockUser={handleBlockUser}
        handleDeleteTicket={handleDeleteTicket}
        token={token}
        onMessagesUpdate={onMessagesUpdate}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-end">
        <PurgeButton
          url="https://functions.poehali.dev/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=purge_open"
          token={token}
          label="Удалить все незакрытые"
          title="Удалить все незакрытые обращения?"
          description="Будут удалены все обращения, кроме закрытых, вместе с перепиской. Закрытые обращения останутся. Отменить это действие нельзя."
          onDone={onRefresh}
        />
      </div>
      <TicketFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterServer={filterServer}
        setFilterServer={setFilterServer}
        filterUnread={filterUnread}
        setFilterUnread={setFilterUnread}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        servers={servers}
        onRefresh={onRefresh}
      />

      <TicketList
        tickets={tickets}
        setSelectedTicket={setSelectedTicket}
        loadTicketDetails={loadTicketDetails}
        token={token}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
      />
    </div>
  );
};

export default TicketsTab;