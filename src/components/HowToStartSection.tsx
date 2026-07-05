import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const HowToStartSection = () => {
  return (
    <section id="how-to-start" className="py-20 relative">

      <div className="container relative z-10">
        <Card className="max-w-3xl mx-auto glow-border bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/30">
                <Icon name="Rocket" className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl glow-text">Как начать играть?</CardTitle>
            <CardDescription className="text-base">
              Следуйте простым шагам, чтобы присоединиться к нашему сообществу
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-primary/10 hover:border-primary/30 transition-all">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg shadow-primary/50">
                  1
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold mb-1">Купите игру в Steam</h4>
                  <p className="text-sm text-muted-foreground">
                    Мы не поддерживаем пиратство и советуем купить игру на площадке STEAM, во избежании проблем с подключением к нашим серверам.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-primary/10 hover:border-primary/30 transition-all">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg shadow-primary/50">
                  2
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold mb-1">Выберите сервер</h4>
                  <p className="text-sm text-muted-foreground">
                    Из списка выше выберите сервер, который соответствует вашему стилю игры
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-primary/10 hover:border-primary/30 transition-all">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg shadow-primary/50">
                  3
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold mb-1">Подключитесь и играйте</h4>
                  <p className="text-sm text-muted-foreground">Запустите игру, находясь в главном меню нажмите клавишу F1 и вставьте туда: Connect "Адрес сервера", нажмите Enter и начните своё приключение на DevilRust!</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-6 sm:gap-3">
              <Button size="lg" className="w-full bg-[#1b2838] hover:bg-[#2a475e] text-white shadow-lg shadow-[#66c0f4]/30 hover:shadow-[#66c0f4]/50 border border-[#66c0f4]/50 hover:border-[#66c0f4] transition-all relative overflow-hidden group" asChild>
                <a href="https://store.steampowered.com/app/252490/Rust/" target="_blank" rel="noopener noreferrer" className="relative z-10">
                  <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <Icon name="Skull" className="absolute top-2 left-2 w-8 h-8 text-white" />
                    <Icon name="Anchor" className="absolute bottom-2 right-2 w-10 h-10 text-white" />
                    <Icon name="Crosshair" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white" />
                  </div>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm8.6-11.013c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
                  </svg>
                  Купить игру в Steam
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default memo(HowToStartSection);