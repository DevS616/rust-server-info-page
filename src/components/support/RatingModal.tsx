import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  ticketSubject: string;
}

const RatingModal = ({ open, onClose, onSubmit, ticketSubject }: RatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setRating(0);
      setHoveredRating(0);
      setComment('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Оцените качество поддержки</DialogTitle>
          <DialogDescription className="text-slate-400">
            {ticketSubject}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <Label className="text-sm text-slate-400 mb-3 block">
              Насколько вы довольны решением вашего обращения?
            </Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                  disabled={submitting}
                >
                  <Icon 
                    name={star <= (hoveredRating || rating) ? 'Star' : 'Star'}
                    size={40}
                    className={star <= (hoveredRating || rating) 
                      ? 'text-yellow-500 fill-yellow-500' 
                      : 'text-slate-600'
                    }
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-slate-400 mt-2">
                {rating === 1 && 'Очень плохо'}
                {rating === 2 && 'Плохо'}
                {rating === 3 && 'Удовлетворительно'}
                {rating === 4 && 'Хорошо'}
                {rating === 5 && 'Отлично'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-slate-300">
              Комментарий (необязательно)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите подробнее о вашем опыте..."
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-slate-700 text-white hover:bg-slate-800"
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {submitting ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Icon name="Check" size={16} className="mr-2" />
                  Отправить оценку
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
