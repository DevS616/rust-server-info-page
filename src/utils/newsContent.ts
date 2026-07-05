import DOMPurify from 'dompurify';

const ALLOWED = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div', 'font'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'color'],
};

export const sanitizeNewsHtml = (html: string): string => {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, ALLOWED);
  return clean;
};

export const isHtmlContent = (text: string): boolean => {
  if (!text) return false;
  return /<\/?[a-z][\s\S]*>/i.test(text);
};

export const stripHtml = (text: string): string => {
  if (!text) return '';
  if (!isHtmlContent(text)) return text;
  const tmp = document.createElement('div');
  tmp.innerHTML = sanitizeNewsHtml(text);
  return (tmp.textContent || tmp.innerText || '').trim();
};

export const previewText = (text: string, length: number): { preview: string; isLong: boolean } => {
  const plain = stripHtml(text);
  const isLong = plain.length > length;
  const preview = isLong ? plain.slice(0, length).trimEnd() + '…' : plain;
  return { preview, isLong };
};
