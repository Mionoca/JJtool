import type { NewsArticle } from "@/types/news";

interface Props {
  article: NewsArticle;
  onRead: (id: number) => void;
}

export default function NewsCard({ article, onRead }: Props) {
  const handleClick = () => {
    onRead(article.id);
    window.open(article.url, "_blank");
  };

  return (
    <div
      className={`
        p-3 rounded-lg cursor-pointer transition-all duration-200
        hover:bg-white/60 border border-transparent hover:border-white/30
        ${article.is_read ? "opacity-60" : ""}
      `}
      onClick={handleClick}
    >
      <h3 className="text-sm font-medium text-fluent-text line-clamp-2">
        {article.title}
      </h3>
      {article.summary && (
        <p className="text-xs text-fluent-muted mt-1 line-clamp-2">
          {article.summary}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1.5">
        {article.source && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-600">
            {article.source}
          </span>
        )}
        <span className="text-xs text-fluent-muted">
          {formatTime(article.fetched_at)}
        </span>
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr.replace(" ", "T"));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  } catch {
    return dateStr;
  }
}
