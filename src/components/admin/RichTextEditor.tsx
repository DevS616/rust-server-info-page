import { useRef, useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface ToolButton {
  cmd: string;
  arg?: string;
  icon: string;
  title: string;
  block?: boolean;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#000000'];

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [active, setActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      setIsEmpty(!value || value === '<br>');
    }
  }, [value]);

  const emit = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setIsEmpty(!html || html === '<br>' || html === '<div><br></div>');
    onChange(html);
  }, [onChange]);

  const updateActive = useCallback(() => {
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
    });
  }, []);

  const exec = useCallback((cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
    updateActive();
  }, [emit, updateActive]);

  const formatBlock = useCallback((tag: string) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
    emit();
  }, [emit]);

  const addLink = useCallback(() => {
    const url = window.prompt('Введите ссылку (https://...)');
    if (url) exec('createLink', url);
  }, [exec]);

  const inlineButtons: ToolButton[] = [
    { cmd: 'bold', icon: 'Bold', title: 'Жирный' },
    { cmd: 'italic', icon: 'Italic', title: 'Курсив' },
    { cmd: 'underline', icon: 'Underline', title: 'Подчёркнутый' },
    { cmd: 'strikeThrough', icon: 'Strikethrough', title: 'Зачёркнутый' },
  ];

  const listButtons: ToolButton[] = [
    { cmd: 'insertUnorderedList', icon: 'List', title: 'Маркированный список' },
    { cmd: 'insertOrderedList', icon: 'ListOrdered', title: 'Нумерованный список' },
  ];

  const alignButtons: ToolButton[] = [
    { cmd: 'justifyLeft', icon: 'AlignLeft', title: 'По левому краю' },
    { cmd: 'justifyCenter', icon: 'AlignCenter', title: 'По центру' },
    { cmd: 'justifyRight', icon: 'AlignRight', title: 'По правому краю' },
  ];

  const ToolBtn = ({ btn }: { btn: ToolButton }) => (
    <button
      type="button"
      title={btn.title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => exec(btn.cmd, btn.arg)}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded transition-colors hover:bg-muted',
        active[btn.cmd] && 'bg-primary/20 text-primary'
      )}
    >
      <Icon name={btn.icon} size={16} />
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-border mx-1" />;

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
        <button
          type="button"
          title="Обычный текст"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => formatBlock('p')}
          className="h-8 px-2 flex items-center justify-center rounded transition-colors hover:bg-muted text-sm"
        >
          <Icon name="Type" size={16} />
        </button>
        <button
          type="button"
          title="Заголовок"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => formatBlock('h3')}
          className="h-8 px-2 flex items-center justify-center rounded transition-colors hover:bg-muted text-sm font-bold"
        >
          H
        </button>
        <button
          type="button"
          title="Подзаголовок"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => formatBlock('h4')}
          className="h-8 px-2 flex items-center justify-center rounded transition-colors hover:bg-muted text-xs font-bold"
        >
          h
        </button>
        <button
          type="button"
          title="Цитата"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => formatBlock('blockquote')}
          className="h-8 w-8 flex items-center justify-center rounded transition-colors hover:bg-muted"
        >
          <Icon name="Quote" size={16} />
        </button>

        <Divider />

        {inlineButtons.map((btn) => <ToolBtn key={btn.cmd} btn={btn} />)}

        <Divider />

        <div className="relative">
          <button
            type="button"
            title="Цвет текста"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowColors((s) => !s)}
            className="h-8 w-8 flex items-center justify-center rounded transition-colors hover:bg-muted"
          >
            <Icon name="Palette" size={16} />
          </button>
          {showColors && (
            <div className="absolute z-20 top-9 left-0 p-2 bg-popover border rounded-lg shadow-lg grid grid-cols-5 gap-1.5 w-max">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec('foreColor', c); setShowColors(false); }}
                  className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        <Divider />

        {listButtons.map((btn) => <ToolBtn key={btn.cmd} btn={btn} />)}

        <Divider />

        {alignButtons.map((btn) => <ToolBtn key={btn.cmd} btn={btn} />)}

        <Divider />

        <button
          type="button"
          title="Вставить ссылку"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="h-8 w-8 flex items-center justify-center rounded transition-colors hover:bg-muted"
        >
          <Icon name="Link" size={16} />
        </button>
        <button
          type="button"
          title="Убрать форматирование"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('removeFormat')}
          className="h-8 w-8 flex items-center justify-center rounded transition-colors hover:bg-muted"
        >
          <Icon name="RemoveFormatting" size={16} />
        </button>
      </div>

      <div className="relative">
        {isEmpty && (
          <div className="absolute top-3 left-3 text-muted-foreground pointer-events-none text-sm">
            {placeholder || 'Начните писать...'}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onKeyUp={updateActive}
          onMouseUp={updateActive}
          onBlur={emit}
          className="news-editor min-h-[200px] max-h-[400px] overflow-y-auto p-3 text-sm focus:outline-none prose prose-sm prose-invert max-w-none"
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
