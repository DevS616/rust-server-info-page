import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const API_URL = 'https://functions.poehali.dev/861911cd-09d8-4e21-b217-cab6c3150641';

interface UploadItem {
  file: File;
  customName: string;
  preview: string;
}

interface HostedFile {
  key: string;
  filename: string;
  url: string;
  size: number;
  last_modified: string;
}

interface FileLinksModalProps {
  file: HostedFile;
  onClose: () => void;
  onDelete: (key: string) => void;
}

const isImage = (filename: string) =>
  /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const FileLinksModal = ({ file, onClose, onDelete }: FileLinksModalProps) => {
  const { toast } = useToast();

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано!' });
  };

  const markdownLink = `![${file.filename}](${file.url})`;
  const htmlLink = `<img src="${file.url}" alt="${file.filename}" />`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg bg-slate-900 border-slate-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white truncate pr-4">{file.filename}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="X" size={20} />
          </button>
        </div>

        {isImage(file.filename) && (
          <div className="mb-4 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center max-h-64">
            <img
              src={file.url}
              alt={file.filename}
              className="max-h-64 object-contain"
            />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Прямая ссылка</p>
            <div className="flex gap-2">
              <Input
                value={file.url}
                readOnly
                className="bg-slate-800 border-slate-700 text-slate-200 text-xs"
              />
              <Button size="sm" variant="outline" onClick={() => copy(file.url)}>
                <Icon name="Copy" size={14} />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Markdown</p>
            <div className="flex gap-2">
              <Input
                value={markdownLink}
                readOnly
                className="bg-slate-800 border-slate-700 text-slate-200 text-xs"
              />
              <Button size="sm" variant="outline" onClick={() => copy(markdownLink)}>
                <Icon name="Copy" size={14} />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">HTML</p>
            <div className="flex gap-2">
              <Input
                value={htmlLink}
                readOnly
                className="bg-slate-800 border-slate-700 text-slate-200 text-xs"
              />
              <Button size="sm" variant="outline" onClick={() => copy(htmlLink)}>
                <Icon name="Copy" size={14} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-700">
          <span className="text-xs text-slate-500">
            {formatSize(file.size)} · {new Date(file.last_modified).toLocaleString('ru-RU')}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-900/30"
            onClick={() => {
              onDelete(file.key);
              onClose();
            }}
          >
            <Icon name="Trash2" size={14} className="mr-1" />
            Удалить
          </Button>
        </div>
      </Card>
    </div>
  );
};

const ImgHosting = () => {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [files, setFiles] = useState<HostedFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<HostedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<number, 'pending' | 'done' | 'error'>>({});
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin_token');
    if (stored) {
      setToken(stored);
      setAuthorized(true);
      loadFiles(stored);
    }
  }, []);

  const loadFiles = async (authToken: string) => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_URL}/?action=list`, {
        headers: { 'X-Auth-Token': authToken },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        toast({ title: 'Нет доступа', description: 'Войдите в админ-панель', variant: 'destructive' });
        setAuthorized(false);
      }
    } finally {
      setLoadingList(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).slice(0, 10);
    const items: UploadItem[] = picked.map((f) => ({
      file: f,
      customName: f.name.replace(/\.[^.]+$/, ''),
      preview: isImage(f.name) ? URL.createObjectURL(f) : '',
    }));
    setUploadQueue((prev) => [...prev, ...items].slice(0, 10));
    e.target.value = '';
  };

  const removeFromQueue = (idx: number) => {
    setUploadQueue((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCustomName = (idx: number, name: string) => {
    setUploadQueue((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, customName: name } : item))
    );
  };

  const uploadAll = async () => {
    if (!uploadQueue.length || !token) return;
    setUploading(true);
    const progress: Record<number, 'pending' | 'done' | 'error'> = {};
    uploadQueue.forEach((_, i) => { progress[i] = 'pending'; });
    setUploadProgress({ ...progress });

    const filesPayload = await Promise.all(
      uploadQueue.map(async (item, i) => {
        try {
          const b64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
            reader.readAsDataURL(item.file);
          });
          return {
            idx: i,
            data: b64,
            filename: item.file.name,
            content_type: item.file.type || 'application/octet-stream',
            custom_name: item.customName,
          };
        } catch {
          return { idx: i, data: '', filename: item.file.name, content_type: '', custom_name: '' };
        }
      })
    );

    try {
      const res = await fetch(`${API_URL}/?action=upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({
          files: filesPayload.map(({ idx: _idx, ...rest }) => rest),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results: { url?: string; error?: string }[] = data.results || [];
        results.forEach((r, i) => {
          progress[i] = r.error ? 'error' : 'done';
        });
        setUploadProgress({ ...progress });
        toast({ title: `Загружено ${results.filter((r) => !r.error).length} из ${results.length} файлов` });
        setUploadQueue([]);
        await loadFiles(token);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить файлы', variant: 'destructive' });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const deleteFile = async (key: string) => {
    if (!token || !confirm('Удалить файл?')) return;
    const res = await fetch(`${API_URL}/?action=delete&key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': token },
    });
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.key !== key));
      toast({ title: 'Файл удалён' });
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="p-8 bg-slate-900 border-slate-700 text-center max-w-sm w-full">
          <Icon name="Lock" size={40} className="mx-auto mb-4 text-slate-500" />
          <h1 className="text-xl font-bold text-white mb-2">Доступ закрыт</h1>
          <p className="text-slate-400 text-sm mb-4">Войдите в админ-панель чтобы использовать хостинг изображений</p>
          <Button onClick={() => { window.location.href = '/admin'; }} className="w-full">
            Перейти в админку
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Шапка */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-slate-400 hover:text-white transition-colors">
              <Icon name="ArrowLeft" size={20} />
            </a>
            <div>
              <h1 className="text-2xl font-bold">Хостинг изображений</h1>
              <p className="text-slate-500 text-sm">{files.length} файлов в хранилище</p>
            </div>
          </div>
          <Button onClick={() => loadFiles(token!)} variant="outline" disabled={loadingList} className="border-slate-700">
            <Icon name={loadingList ? 'Loader2' : 'RefreshCw'} size={16} className={`mr-2 ${loadingList ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {/* Зона загрузки */}
        <Card className="bg-slate-900 border-slate-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Загрузить файлы</h2>
            <span className="text-xs text-slate-500">До 10 файлов · 100 МБ каждый</span>
          </div>

          {uploadQueue.length === 0 ? (
            <div
              className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center cursor-pointer hover:border-slate-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="Upload" size={36} className="mx-auto mb-3 text-slate-500" />
              <p className="text-slate-400 mb-1">Нажмите для выбора файлов</p>
              <p className="text-slate-600 text-sm">или перетащите сюда</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadQueue.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3">
                  {item.preview ? (
                    <img src={item.preview} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="File" size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-1 truncate">{item.file.name} ({formatSize(item.file.size)})</p>
                    <Input
                      value={item.customName}
                      onChange={(e) => updateCustomName(idx, e.target.value)}
                      placeholder="Имя файла (без расширения)"
                      className="bg-slate-700 border-slate-600 h-8 text-sm"
                    />
                  </div>
                  {uploadProgress[idx] === 'done' && <Icon name="CheckCircle" size={18} className="text-green-400 flex-shrink-0" />}
                  {uploadProgress[idx] === 'error' && <Icon name="XCircle" size={18} className="text-red-400 flex-shrink-0" />}
                  {!uploadProgress[idx] && (
                    <button onClick={() => removeFromQueue(idx)} className="text-slate-500 hover:text-white flex-shrink-0">
                      <Icon name="X" size={16} />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={uploadAll}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading
                    ? <><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Загружаю...</>
                    : <><Icon name="Upload" size={16} className="mr-2" />Загрузить {uploadQueue.length} {uploadQueue.length === 1 ? 'файл' : 'файлов'}</>
                  }
                </Button>
                {uploadQueue.length < 10 && (
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-slate-700">
                    <Icon name="Plus" size={16} className="mr-1" />
                    Добавить
                  </Button>
                )}
                <Button variant="outline" onClick={() => setUploadQueue([])} className="border-slate-700 text-slate-400">
                  Очистить
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFilePick}
          />
        </Card>

        {/* Галерея */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-semibold">Все файлы</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по имени..."
                  className="pl-8 bg-slate-800 border-slate-700 h-9 text-sm"
                />
              </div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-3 h-9 text-sm focus:outline-none"
              >
                <option value="newest">Новые</option>
                <option value="oldest">Старые</option>
                <option value="name">По имени</option>
                <option value="size">По размеру</option>
              </select>
            </div>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center py-16">
              <Icon name="Loader2" size={32} className="animate-spin text-slate-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Icon name="Image" size={40} className="mx-auto mb-3 opacity-30" />
              <p>Нет загруженных файлов</p>
            </div>
          ) : (() => {
            const q = search.toLowerCase().trim();
            const filtered = files
              .filter((f) => !q || f.filename.toLowerCase().includes(q))
              .sort((a, b) => {
                if (sortOrder === 'newest') return new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime();
                if (sortOrder === 'oldest') return new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime();
                if (sortOrder === 'name') return a.filename.localeCompare(b.filename);
                if (sortOrder === 'size') return b.size - a.size;
                return 0;
              });
            return filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Icon name="SearchX" size={32} className="mx-auto mb-3 opacity-30" />
                <p>Ничего не найдено по запросу «{search}»</p>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((f) => (
                <div
                  key={f.key}
                  className="group relative aspect-square bg-slate-800 rounded-xl overflow-hidden cursor-pointer border border-slate-700 hover:border-slate-500 transition-all"
                  onClick={() => setSelectedFile(f)}
                >
                  {isImage(f.filename) ? (
                    <img
                      src={f.url}
                      alt={f.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Icon name="File" size={28} className="text-slate-400" />
                      <span className="text-[10px] text-slate-500 text-center px-1 truncate w-full text-center">
                        {f.filename}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Icon name="Link" size={22} className="text-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-all">
                    <p className="text-[10px] text-white truncate">{f.filename}</p>
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </div>
      </div>

      {selectedFile && (
        <FileLinksModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDelete={deleteFile}
        />
      )}
    </div>
  );
};

export default ImgHosting;