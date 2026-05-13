import { useEffect } from "react";
import { useNewsStore } from "@/stores/newsStore";
import NewsCard from "./NewsCard";

export default function NewsPanel() {
  const { articles, loading, fetchArticles, markRead, refresh } =
    useNewsStore();

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div className="w-80 h-[500px] glass rounded-2xl shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
        <h2 className="text-base font-semibold text-fluent-text">
          资讯动态
        </h2>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-lg bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors disabled:opacity-50"
        >
          {loading ? "刷新中..." : "刷新"}
        </button>
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {articles.length === 0 && !loading && (
          <div className="text-center text-fluent-muted text-sm py-8">
            暂无资讯，点击刷新获取
          </div>
        )}
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} onRead={markRead} />
        ))}
        {loading && articles.length === 0 && (
          <div className="text-center text-fluent-muted text-sm py-8">
            加载中...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/20 text-xs text-fluent-muted text-center">
        共 {articles.length} 条资讯 · 来源于公开 RSS
      </div>
    </div>
  );
}
