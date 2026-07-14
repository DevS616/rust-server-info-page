import { useState, useEffect, useRef, memo, useCallback } from 'react';
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

interface ServerEntry {
  ip: string;
  port: number;
  players: number;
  playersMax: number;
}

const SERVERS_API = 'https://functions.poehali.dev/cd63f370-b8ea-4adc-ace4-a274aa6f6e34';

const serverWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сервер';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'сервера';
  return 'серверов';
};

const gameModeCount = Object.keys(serversData).filter(k => k.endsWith('Servers')).length;

const gameModeWord = (() => {
  if (gameModeCount === 1) return 'РЕЖИМ ИГРЫ';
  if (gameModeCount >= 2 && gameModeCount <= 4) return 'РЕЖИМА ИГРЫ';
  return 'РЕЖИМОВ ИГРЫ';
})();

const HeroSection = () => {
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [displayPlayers, setDisplayPlayers] = useState<number>(0);
  const [onlineServersCount, setOnlineServersCount] = useState<number>(0);
  const [activeServerIps, setActiveServerIps] = useState<string[]>([]);
  const [coinRain, setCoinRain] = useState(false);
  const lastVendingSound = useRef(0);
  const displayPlayersRef = useRef(0);

  const playVendingSound = useCallback(() => {
    const now = Date.now();
    if (now - lastVendingSound.current < 1000) return;
    lastVendingSound.current = now;

    const AudioCtxCtor = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxCtor) return;
    const audioContext = new AudioCtxCtor();

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
  }, []);

  useEffect(() => {
    fetch(`${SERVERS_API}/?active=true`)
      .then(r => r.json())
      .then(data => {
        const ips = (data.servers || [])
          .map((s: { server_ip?: string }) => s.server_ip || '')
          .filter(Boolean);
        setActiveServerIps(ips);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = monitoringService.subscribe((data) => {
      if (data?.result === 'success' && data.data?.total?.players !== undefined) {
        setTotalPlayers(data.data.total.players);

        let onlineCount = 0;
        data.data.servers.forEach((server: ServerEntry) => {
          const serverIp = `${server.ip}:${server.port}`;
          if (activeServerIps.includes(serverIp) && server.playersMax > 0) onlineCount++;
        });
        setOnlineServersCount(onlineCount);
      }
    });
    return unsubscribe;
  }, [activeServerIps]);

  useEffect(() => {
    if (totalPlayers === null) return;
    const start = displayPlayersRef.current;
    const diff = totalPlayers - start;
    const steps = 25;
    const interval = 1000 / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        displayPlayersRef.current = totalPlayers;
        setDisplayPlayers(totalPlayers);
        clearInterval(timer);
      } else {
        const next = Math.round(start + (diff * step) / steps);
        displayPlayersRef.current = next;
        setDisplayPlayers(next);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [totalPlayers]);

  return (
    <section className="relative w-full py-24 md:py-32 lg:py-40 overflow-hidden">
      {coinRain && <div className="coin-rain-overlay" aria-hidden="true" />}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
      </div>
      <div className="container relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl glow-text">
              Добро пожаловать на
              <span className="block text-primary mt-2 hero-glow-text">DevilRust</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl">
              {(() => { const n = activeServerIps.length; return `${n} уникальны${n % 10 === 1 && n % 100 !== 11 ? 'й' : 'х'} ${serverWord(n)}`; })()} для каждого стиля игры. От хардкорно-ванильного опыта до безумно-модифицированного веселья
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="text-lg shadow-lg shadow-primary/50 hover:shadow-primary/70 hover:scale-105 transition-all group"
                onClick={() => document.getElementById('how-to-start')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Icon name="Play" className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                Как начать играть
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg border-primary/30 hover:border-primary hover:bg-primary/10 h-auto"
                onClick={() => document.getElementById('servers')?.scrollIntoView({ behavior: 'smooth' })}
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
            >
              <a
                href="https://devilrust.ru"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setCoinRain(true)}
                onMouseLeave={() => setCoinRain(false)}
                onClick={playVendingSound}
              >
                <Icon name="ShoppingBag" className="mr-2 h-5 w-5" />
                Донат магазин
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-8">
            <div className="flex flex-col items-center p-4 rounded-lg glow-border bg-card/50 backdrop-blur-sm">
              <div className="text-4xl font-bold text-primary glow-text">{onlineServersCount}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">{serverWord(onlineServersCount)} онлайн</div>
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
              <div className="text-3xl font-bold text-primary glow-text">{gameModeCount}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">{gameModeWord}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(HeroSection);