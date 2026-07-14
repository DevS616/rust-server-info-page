import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { formatMskDateTime } from '@/utils/dateFormat';

const PRICING_API = 'https://functions.poehali.dev/3682a8f1-28c6-47a6-b68b-36b371bdd6a8';

interface PriceItem {
  id: number;
  title: string;
  description: string;
  price: number;
  is_active: boolean;
  position: number;
}

interface Fundraiser {
  id: number;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  is_active: boolean;
  status: string;
  created_at: string;
}

interface Donation {
  id: number;
  steam_id: string | null;
  steam_username: string;
  amount: number;
  comment: string;
  created_at: string;
}

interface PricingTabProps {
  token: string;
}

const PricingTab = ({ token }: PricingTabProps) => {
  const authHeaders = { 'Content-Type': 'application/json', 'X-Auth-Token': token };
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [selectedFundraiser, setSelectedFundraiser] = useState<Fundraiser | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  // Модалки
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showFundraiserModal, setShowFundraiserModal] = useState(false);
  const [showDonationsModal, setShowDonationsModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceItem | null>(null);
  const [editingFundraiser, setEditingFundraiser] = useState<Fundraiser | null>(null);

  // Форма прайса
  const [priceForm, setPriceForm] = useState({
    title: '',
    description: '',
    price: 0,
    is_active: true,
    position: 0
  });

  // Форма сбора
  const [fundraiserForm, setFundraiserForm] = useState({
    title: '',
    description: '',
    goal_amount: 0,
    current_amount: 0,
    is_active: true,
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricesRes, fundraisersRes] = await Promise.all([
        fetch(`${PRICING_API}?action=get_prices`),
        fetch(`${PRICING_API}?action=get_fundraisers`)
      ]);

      const pricesData = await pricesRes.json();
      const fundraisersData = await fundraisersRes.json();

      setPriceItems(pricesData.items || []);
      setFundraisers(fundraisersData.fundraisers || []);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDonations = async (fundraiserId: number) => {
    try {
      const res = await fetch(`${PRICING_API}?action=get_donations&fundraiser_id=${fundraiserId}`);
      const data = await res.json();
      setDonations(data.donations || []);
    } catch (error) {
      console.error('Ошибка загрузки донатов:', error);
    }
  };

  const handleSavePrice = async () => {
    try {
      const url = editingPrice
        ? `${PRICING_API}?action=update_price&item_id=${editingPrice.id}`
        : `${PRICING_API}?action=create_price`;

      await fetch(url, {
        method: editingPrice ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(priceForm)
      });

      setShowPriceModal(false);
      setPriceForm({ title: '', description: '', price: 0, is_active: true, position: 0 });
      setEditingPrice(null);
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения прайса:', error);
    }
  };

  const handleSaveFundraiser = async () => {
    try {
      const url = editingFundraiser
        ? `${PRICING_API}?action=update_fundraiser&fundraiser_id=${editingFundraiser.id}`
        : `${PRICING_API}?action=create_fundraiser`;

      await fetch(url, {
        method: editingFundraiser ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(fundraiserForm)
      });

      setShowFundraiserModal(false);
      setFundraiserForm({ title: '', description: '', goal_amount: 0, current_amount: 0, is_active: true, status: 'active' });
      setEditingFundraiser(null);
      loadData();
    } catch (error) {
      console.error('Ошибка сохранения сбора:', error);
    }
  };

  const openEditPrice = (item: PriceItem) => {
    setEditingPrice(item);
    setPriceForm({
      title: item.title,
      description: item.description,
      price: item.price,
      is_active: item.is_active,
      position: item.position
    });
    setShowPriceModal(true);
  };

  const openEditFundraiser = (fundraiser: Fundraiser) => {
    setEditingFundraiser(fundraiser);
    setFundraiserForm({
      title: fundraiser.title,
      description: fundraiser.description,
      goal_amount: fundraiser.goal_amount,
      current_amount: fundraiser.current_amount,
      is_active: fundraiser.is_active,
      status: fundraiser.status
    });
    setShowFundraiserModal(true);
  };

  const openDonations = async (fundraiser: Fundraiser) => {
    setSelectedFundraiser(fundraiser);
    await loadDonations(fundraiser.id);
    setShowDonationsModal(true);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
  };

  const getProgressPercent = (current: number, goal: number) => {
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="Loader2" className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Сборы средств */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Сборы средств</h2>
          <Button onClick={() => { setEditingFundraiser(null); setFundraiserForm({ title: '', description: '', goal_amount: 0, current_amount: 0, is_active: true, status: 'active' }); setShowFundraiserModal(true); }}>
            <Icon name="Plus" size={16} className="mr-2" />
            Создать сбор
          </Button>
        </div>

        <div className="grid gap-4">
          {fundraisers.map((fundraiser) => {
            const percent = getProgressPercent(fundraiser.current_amount, fundraiser.goal_amount);
            const remaining = fundraiser.goal_amount - fundraiser.current_amount;

            return (
              <Card key={fundraiser.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{fundraiser.title}</h3>
                      {fundraiser.is_active && (
                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">Активен</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{fundraiser.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDonations(fundraiser)}>
                      <Icon name="History" size={16} className="mr-2" />
                      История
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditFundraiser(fundraiser)}>
                      <Icon name="Edit" size={16} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Собрано</span>
                    <span className="font-semibold text-green-500">{formatMoney(fundraiser.current_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Осталось</span>
                    <span className="font-semibold">{formatMoney(remaining)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Цель</span>
                    <span className="font-semibold">{formatMoney(fundraiser.goal_amount)}</span>
                  </div>

                  <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-green-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-center text-sm font-semibold text-muted-foreground">
                    {percent}% собрано
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Прайс-лист */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Прайс-лист</h2>
          <Button onClick={() => { setEditingPrice(null); setPriceForm({ title: '', description: '', price: 0, is_active: true, position: 0 }); setShowPriceModal(true); }}>
            <Icon name="Plus" size={16} className="mr-2" />
            Добавить позицию
          </Button>
        </div>

        <div className="grid gap-3">
          {priceItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    {!item.is_active && (
                      <span className="text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded">Неактивен</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                  <p className="text-lg font-bold text-green-500">{formatMoney(item.price)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEditPrice(item)}>
                  <Icon name="Edit" size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Модалка создания/редактирования прайса */}
      <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrice ? 'Редактировать' : 'Создать'} позицию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={priceForm.title}
                onChange={(e) => setPriceForm({ ...priceForm, title: e.target.value })}
                placeholder="VIP статус"
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={priceForm.description}
                onChange={(e) => setPriceForm({ ...priceForm, description: e.target.value })}
                placeholder="Описание услуги..."
              />
            </div>
            <div>
              <Label>Цена (₽)</Label>
              <Input
                type="number"
                value={priceForm.price}
                onChange={(e) => setPriceForm({ ...priceForm, price: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Позиция</Label>
              <Input
                type="number"
                value={priceForm.position}
                onChange={(e) => setPriceForm({ ...priceForm, position: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={priceForm.is_active}
                onCheckedChange={(checked) => setPriceForm({ ...priceForm, is_active: checked })}
              />
              <Label>Активна</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSavePrice} className="flex-1">Сохранить</Button>
              <Button variant="outline" onClick={() => setShowPriceModal(false)} className="flex-1">Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модалка создания/редактирования сбора */}
      <Dialog open={showFundraiserModal} onOpenChange={setShowFundraiserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFundraiser ? 'Редактировать' : 'Создать'} сбор</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={fundraiserForm.title}
                onChange={(e) => setFundraiserForm({ ...fundraiserForm, title: e.target.value })}
                placeholder="Разработка админ-панели"
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={fundraiserForm.description}
                onChange={(e) => setFundraiserForm({ ...fundraiserForm, description: e.target.value })}
                placeholder="Описание сбора..."
              />
            </div>
            <div>
              <Label>Цель (₽)</Label>
              <Input
                type="number"
                value={fundraiserForm.goal_amount}
                onChange={(e) => setFundraiserForm({ ...fundraiserForm, goal_amount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Текущая сумма (₽)</Label>
              <Input
                type="number"
                value={fundraiserForm.current_amount}
                onChange={(e) => setFundraiserForm({ ...fundraiserForm, current_amount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={fundraiserForm.is_active}
                onCheckedChange={(checked) => setFundraiserForm({ ...fundraiserForm, is_active: checked })}
              />
              <Label>Активен</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveFundraiser} className="flex-1">Сохранить</Button>
              <Button variant="outline" onClick={() => setShowFundraiserModal(false)} className="flex-1">Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модалка истории донатов */}
      <Dialog open={showDonationsModal} onOpenChange={setShowDonationsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>История пополнений: {selectedFundraiser?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {donations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Пополнений пока нет</p>
            ) : (
              donations.map((donation) => (
                <Card key={donation.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{donation.steam_username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatMskDateTime(donation.created_at)}
                        </span>
                      </div>
                      {donation.steam_id && (
                        <p className="text-xs text-muted-foreground mb-2">Steam ID: {donation.steam_id}</p>
                      )}
                      {donation.comment && (
                        <p className="text-sm text-muted-foreground">{donation.comment}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-500">+{formatMoney(donation.amount)}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingTab;