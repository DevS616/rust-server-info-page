import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

export const POLLS_API = 'https://functions.poehali.dev/b11aeefa-8364-460f-a54e-6338ddb77cf3';

export interface PollOption {
  id: number;
  text: string;
  image_url?: string | null;
  votes: number;
}

export interface Poll {
  id: number;
  title: string;
  description: string;
  multiple_choice: boolean;
  is_map_vote: boolean;
  is_active: boolean;
  ends_at: string | null;
  total_votes: number;
  options: PollOption[];
  my_votes: number[];
  has_voted: boolean;
  is_finished: boolean;
  winner_option_id: number | null;
}

const getSteamId = (): string => {
  try {
    const u = localStorage.getItem('steam_user');
    if (u) return JSON.parse(u).steamId || '';
  } catch { /* ignore */ }
  return '';
};

interface PollCardProps {
  poll: Poll;
  onUpdated: (poll: Poll) => void;
}

const PollCard = ({ poll, onUpdated }: PollCardProps) => {
  const { toast } = useToast();
  const [selected, setSelected] = useState<number[]>(poll.my_votes || []);
  const [submitting, setSubmitting] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const showResults = poll.has_voted || poll.is_finished;
  const winner = poll.winner_option_id;

  const toggle = (id: number) => {
    if (poll.multiple_choice) {
      setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    } else {
      setSelected([id]);
    }
  };

  const submit = async () => {
    if (!selected.length) {
      toast({ title: 'Выберите вариант', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${POLLS_API}/?action=vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: poll.id, option_ids: selected, steam_id: getSteamId() }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.poll);
        toast({ title: 'Голос учтён!' });
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error || 'Не удалось проголосовать', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сбой соединения', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const pct = (votes: number) => poll.total_votes ? Math.round((votes / poll.total_votes) * 100) : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-2 mb-1 flex-wrap">
        {poll.is_map_vote && (
          <span className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
            <Icon name="Map" size={12} />Карта
          </span>
        )}
        {poll.is_finished && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
            <Icon name="Flag" size={12} />Завершён
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-1">{poll.title}</h3>
      {poll.description && <p className="text-sm text-gray-400 mb-2">{poll.description}</p>}
      <p className="text-xs text-gray-500 mb-4">
        {poll.multiple_choice ? 'Можно выбрать несколько · ' : ''}{poll.total_votes} голосов
        {poll.ends_at && !poll.is_finished && ` · до ${new Date(poll.ends_at).toLocaleString('ru-RU')}`}
      </p>

      <div className="space-y-2.5">
        {poll.options.map(opt => {
          const isSelected = selected.includes(opt.id);
          const isMine = poll.my_votes?.includes(opt.id);
          const isWinner = winner === opt.id;
          const percent = pct(opt.votes);

          return (
            <div key={opt.id}>
              {showResults ? (
                <div className={`relative overflow-hidden rounded-xl border ${isWinner ? 'border-primary' : 'border-gray-700'} bg-gray-800/40`}>
                  <div
                    className={`absolute inset-y-0 left-0 ${isWinner ? 'bg-primary/25' : 'bg-gray-700/50'} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                  <div className="relative flex items-center gap-3 p-3">
                    {opt.image_url && (
                      <img
                        src={opt.image_url}
                        alt=""
                        onClick={(e) => { e.stopPropagation(); setZoomImage(opt.image_url!); }}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 cursor-zoom-in hover:ring-2 hover:ring-primary transition-all"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">{opt.text}</span>
                        {isMine && <Icon name="Check" size={15} className="text-primary shrink-0" />}
                        {isWinner && poll.is_finished && (
                          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shrink-0">Победитель</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white font-bold">{percent}%</div>
                      <div className="text-xs text-gray-400">{opt.votes}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => toggle(opt.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                    ${isSelected ? 'border-primary bg-primary/10' : 'border-gray-700 bg-gray-800/40 hover:bg-gray-800'}`}
                >
                  {poll.multiple_choice ? (
                    <Checkbox checked={isSelected} className="shrink-0" />
                  ) : (
                    <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-gray-500'}`}>
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </span>
                  )}
                  {opt.image_url && (
                    <img
                      src={opt.image_url}
                      alt=""
                      onClick={(e) => { e.stopPropagation(); setZoomImage(opt.image_url!); }}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 cursor-zoom-in hover:ring-2 hover:ring-primary transition-all"
                    />
                  )}
                  <span className="text-white font-medium flex-1">{opt.text}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!showResults && (
        <Button onClick={submit} disabled={submitting || !selected.length} className="w-full mt-4">
          {submitting ? <Icon name="Loader2" className="animate-spin mr-2 h-4 w-4" /> : <Icon name="Check" className="mr-2 h-4 w-4" />}
          Проголосовать
        </Button>
      )}
      {poll.has_voted && !poll.is_finished && (
        <p className="text-center text-xs text-gray-500 mt-3">Вы уже проголосовали. Результаты обновляются в реальном времени.</p>
      )}

      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-transparent border-0 shadow-none">
          {zoomImage && (
            <img src={zoomImage} alt="" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PollCard;