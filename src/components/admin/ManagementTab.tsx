import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';
import MaintenanceSection from './MaintenanceSection';
import ServersManagement from './ServersManagement';
import HolidaysSection from './HolidaysSection';
import ServerDialog, { type Server } from './ServerDialog';

interface ManagementTabProps {
  token: string;
}

const ManagementTab = ({ token }: ManagementTabProps) => {
  const [activeTab, setActiveTab] = useState<'maintenance' | 'servers' | 'holidays'>('maintenance');
  const [showServerDialog, setShowServerDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [serversLength, setServersLength] = useState(0);

  const handleAddServer = () => {
    setEditingServer(null);
    setShowServerDialog(true);
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    setShowServerDialog(true);
  };

  const handleCloseDialog = () => {
    setShowServerDialog(false);
    setEditingServer(null);
  };

  const handleSaveServer = () => {
    setShowServerDialog(false);
    setEditingServer(null);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setActiveTab('maintenance')}
          variant={activeTab === 'maintenance' ? 'default' : 'outline'}
        >
          <Icon name="Settings" className="mr-2" />
          Тех. работы
        </Button>
        <Button
          onClick={() => setActiveTab('servers')}
          variant={activeTab === 'servers' ? 'default' : 'outline'}
        >
          <Icon name="Server" className="mr-2" />
          Карточки серверов
        </Button>
        <Button
          onClick={() => setActiveTab('holidays')}
          variant={activeTab === 'holidays' ? 'default' : 'outline'}
        >
          <Icon name="PartyPopper" className="mr-2" />
          Праздники
        </Button>
      </div>

      {activeTab === 'maintenance' && <MaintenanceSection token={token} />}

      {activeTab === 'servers' && (
        <ServersManagement
          token={token}
          onAddServer={handleAddServer}
          onEditServer={handleEditServer}
        />
      )}

      {activeTab === 'holidays' && <HolidaysSection token={token} />}

      <ServerDialog
        open={showServerDialog}
        server={editingServer}
        serversLength={serversLength}
        token={token}
        onClose={handleCloseDialog}
        onSave={handleSaveServer}
      />
    </div>
  );
};

export default ManagementTab;