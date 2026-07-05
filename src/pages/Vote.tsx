import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PollCard, { type Poll, POLLS_API } from '@/components/PollCard';

const getSteamId = (): string => {
  try {
    const u = localStorage.getItem('steam_user');
    if (u) return JSON.parse(u).steamId || '';
  } catch { /* ignore */ }
  return '';
};

const Vote = () => {
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const steamId = getSteamId();
        const qs = steamId ? `?steam_id=${encodeURIComponent(steamId)}` : '';
        const res = await fetch(`${POLLS_API}/${qs}`);
        if (res.ok) {
          const data = await res.json();
          setPolls(data.polls || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const updatePoll = (updated: Poll) => {
    setPolls(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onOpenBonus={() => {}} onOpenTelegram={() => {}} bonusAvailable={false} />

      <main className="flex-1 container max-w-2xl py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider">Голосования</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Icon name="BarChart3" className="mx-auto mb-4" size={48} />
            <p className="text-lg">Активных голосований сейчас нет</p>
            <p className="text-sm mt-1">Загляните позже — новые опросы появятся здесь</p>
          </div>
        ) : (
          <div className="space-y-5">
            {polls.map(poll => (
              <PollCard key={poll.id} poll={poll} onUpdated={updatePoll} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Vote;
