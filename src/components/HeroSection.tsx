import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { monitoringService } from '@/services/monitoringService';
import serversData from '@/data/servers.json';

const HeroSection = () => {
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [displayPlayers, setDisplayPlayers] = useState<number>(0);
  const [onlineServersCount, setOnlineServersCount] = useState<number>(0);
  const [coinRain, setCoinRain] = useState(false);
  const lastVendingSound = useRef(0);

  const playVendingSound = () => {
    const now = Date.now();
    if (now - lastVendingSound.current < 1000) return;
    
    lastVendingSound.current = now;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    playTone(600, audioContext.currentTime, 0.08, 0.2);
    playTone(800, audioContext.currentTime + 0.08, 0.08, 0.15);
    playTone(1000, audioContext.currentTime + 0.16, 0.12, 0.1);
  };

  useEffect(() => {
    const unsubscribe = monitoringService.subscribe((data) => {
      if (data?.result === 'success' && data.data?.total?.players !== undefined) {
        setTotalPlayers(data.data.total.players);
        
        const allServers = [...serversData.pveServers, ...serversData.pvpServers];
        let onlineCount = 0;
        
        data.data.servers.forEach((server: any) => {
          const serverIp = `${server.ip}:${server.port}`;
          const matchedServer = allServers.find(s => s.serverIp === serverIp);
          
          if (matchedServer && server.playersMax > 0) {
            onlineCount++;
          }
        });
        
        setOnlineServersCount(onlineCount);
      }
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (totalPlayers === null) return;
    
    const duration = 1000;
    const steps = 25;
    const increment = (totalPlayers - displayPlayers) / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayPlayers(totalPlayers);
        clearInterval(timer);
      } else {
        setDisplayPlayers(prev => Math.round(prev + increment));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [totalPlayers]);

  return (
    <section className="relative w-full py-24 md:py-32 lg:py-40 overflow-hidden">
      {coinRain && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <Icon
              key={i}
              name={['Coins', 'DollarSign', 'CircleDollarSign', 'BadgeDollarSign'][i % 4] as any}
              className="absolute text-yellow-400 opacity-[0.08] coin-fall"
              style={{
                left: `${(i * 3.33) % 100}%`,
                width: `${20 + (i % 3) * 10}px`,
                height: `${20 + (i % 3) * 10}px`,
                animationDelay: `${(i % 10) * 0.3}s`,
                animationDuration: `${3 + (i % 5) * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-[128px]" />
      </div>
      <div className="container relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl glow-text">
              Добро пожаловать на
              <span className="block text-primary mt-2 drop-shadow-[0_0_25px_rgba(255,68,0,0.5)]">DevilRust</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl">9 уникальных серверов для каждого стиля игры. От хардкорно-ванильного опыта до безумно-модифицированного веселья</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="text-lg shadow-lg shadow-primary/50 hover:shadow-primary/70 hover:scale-105 transition-all group"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('how-to-start')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Icon name="Play" className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                Как начать играть
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg border-primary/30 hover:border-primary hover:bg-primary/10 h-auto"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('servers')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Icon name="Server" className="mr-2 h-5 w-5" />
                Выбрать сервер
              </Button>
            </div>
            <Button 
              size="lg" 
              variant="default" 
              className="text-lg diamond-shine relative overflow-hidden border-0" 
              asChild
              onMouseEnter={() => setCoinRain(true)}
              onMouseLeave={() => setCoinRain(false)}
            >
              <a 
                href="https://devilrust.ru" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="relative z-10"
                onMouseEnter={() => setCoinRain(true)}
                onMouseLeave={() => setCoinRain(false)}
                onClick={playVendingSound}
              >
                <div className="absolute inset-0 opacity-[0.25] pointer-events-none">
                  <Icon name="Coins" className="absolute top-2 left-4 w-7 h-7 text-yellow-300" />
                  <Icon name="DollarSign" className="absolute bottom-2 right-4 w-9 h-9 text-yellow-200" />
                  <Icon name="Gem" className="absolute top-1/2 left-1/4 -translate-y-1/2 w-6 h-6 text-amber-300" />
                  <Icon name="BadgeDollarSign" className="absolute top-3 right-8 w-8 h-8 text-yellow-400" />
                  <Icon name="CircleDollarSign" className="absolute bottom-3 left-8 w-7 h-7 text-amber-400" />
                </div>
                <Icon name="ShoppingBag" className="mr-2 h-5 w-5" />
                Донат магазин
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-8">
            <div className="flex flex-col items-center p-4 rounded-lg glow-border bg-card/50 backdrop-blur-sm">
              <div className="text-4xl font-bold text-primary glow-text">{onlineServersCount || 9}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Серверов онлайн</div>
            </div>
<TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center p-4 rounded-lg glow-border bg-card/50 backdrop-blur-sm cursor-help">
                    <div className="text-4xl font-bold text-primary glow-text transition-all duration-300">
                      {totalPlayers !== null ? displayPlayers : '...'}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">Игроков онлайн</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Количество онлайна показано примерное, из-за временных проблем с подключениям к иностранным сервисам</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex flex-col items-center p-4 rounded-lg glow-border bg-card/50 backdrop-blur-sm">
              <div className="text-3xl font-bold text-primary glow-text">PVP и PVE</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Сервера</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;