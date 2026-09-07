import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const MaintenanceNotice = () => {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
            <Icon name="Wrench" className="text-amber-500" size={28} />
          </div>
          <DialogTitle className="text-center text-xl">
            Технические работы
          </DialogTitle>
          <DialogDescription className="text-center text-slate-300 text-base pt-2">
            Раздел поддержки находится на технических работах, вам обязательно
            ответят после проведения работ.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={() => setOpen(false)}>
            Ок
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceNotice;
