import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';
import MaintenanceSection from './MaintenanceSection';
import ServersManagement from './ServersManagement';
import HolidaysSection from './HolidaysSection';
import ServerDialog, { type Server } from './ServerDialog';
import PromotionTab from './PromotionTab';
import PricingTab from './PricingTab';
import RoadmapTab from './RoadmapTab';
import PollsTab from './PollsTab';

interface ManagementTabProps {
  token: string;
}

type SubTab = 'maintenance' | 'servers' | 'holidays' | 'promotion' | 'pricing' | 'roadmap' | 'polls';

const ManagementTab = ({ token }: ManagementTabProps) => {
  const [activeTab, setActiveTab] = useState<SubTab>('maintenance');
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
      <div className="flex flex-wrap gap-2 mb-6">
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
        <Button
          onClick={() => setActiveTab('promotion')}
          variant={activeTab === 'promotion' ? 'default' : 'outline'}
        >
          <Icon name="Gift" className="mr-2" />
          Акция
        </Button>
        <Button
          onClick={() => setActiveTab('pricing')}
          variant={activeTab === 'pricing' ? 'default' : 'outline'}
        >
          <Icon name="DollarSign" className="mr-2" />
          Прайс
        </Button>
        <Button
          onClick={() => setActiveTab('roadmap')}
          variant={activeTab === 'roadmap' ? 'default' : 'outline'}
        >
          <Icon name="Map" className="mr-2" />
          Дорожная карта
        </Button>
        <Button
          onClick={() => setActiveTab('polls')}
          variant={activeTab === 'polls' ? 'default' : 'outline'}
        >
          <Icon name="BarChart3" className="mr-2" />
          Опросы
        </Button>
      </div>

      {activeTab === 'maintenance' && <MaintenanceSection token={token} />}

      {activeTab === 'servers' && (
        <ServersManagement
          token={token}
          onAddServer={handleAddServer}
          onEditServer={handleEditServer}
          onServersLoaded={setServersLength}
        />
      )}

      {activeTab === 'holidays' && <HolidaysSection token={token} />}

      {activeTab === 'promotion' && <PromotionTab token={token} />}

      {activeTab === 'pricing' && <PricingTab token={token} />}

      {activeTab === 'roadmap' && <RoadmapTab token={token} />}

      {activeTab === 'polls' && <PollsTab token={token} />}

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