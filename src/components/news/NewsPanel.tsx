import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNewsStore } from "@/stores/newsStore";
import { useWindowSizePersistence } from "@/hooks/useWindowSizePersistence";
import NewsCard from "./NewsCard";

export default function NewsPanel() {
  const { articles, loading, error, lastRefreshCount, fetchArticles, markRead, refresh } =
    useNewsStore();

  useWindowSizePersistence("news", { width: 360, height: 540 });

  useEffect(() => {
    void fetchArticles();
    const unlisten = listen("news-refresh", () => {
      void refresh();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchArticles, refresh]);

  const handleClose = async () => {
    await getCurrentWindow().hide();
  };

  const showKeywordHint = error?.includes("请先设置兴趣关键词");

  return (
    <div className="w-full h-full glass rounded-2xl shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 drag-region">
        <h2 className="text-base font-semibold text-fluent-text">资讯动态</h2>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-lg bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "刷新中..." : "刷新"}
          </button>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center text-fluent-muted hover:text-fluent-text hover:bg-white/50 rounded transition-colors"
            title="关闭"
          >
            x
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-3 rounded-lg bg-red-50/90 border border-red-100 px-3 py-2 text-xs text-red-600 break-words">
          {showKeywordHint ? "请先设置兴趣关键词" : `资讯获取失败：${error}`}
        </div>
      )}

      {lastRefreshCount !== null && !error && (
        <div className="mx-3 mt-3 rounded-lg bg-primary-50/80 border border-primary-100 px-3 py-2 text-xs text-primary-600">
          已根据兴趣关键词刷新，新增 {lastRefreshCount} 条资讯。
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="text-center text-fluent-muted text-sm py-8">加载中...</div>
        )}

        {articles.length === 0 && !loading && !error && (
          <div className="text-center text-fluent-muted text-sm py-8">
            暂无资讯，点击刷新获取
          </div>
        )}

        {articles.map((article) => (
          <NewsCard key={article.id} article={article} onRead={markRead} />
        ))}
      </div>

      <div className="px-4 py-2 border-t border-white/20 text-xs text-fluent-muted text-center">
        共 {articles.length} 条资讯，按兴趣关键词检索
      </div>
    </div>
  );
}
