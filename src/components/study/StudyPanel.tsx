import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStudyStore } from "@/stores/studyStore";
import TaskItem from "./TaskItem";
import PomodoroTimer from "./PomodoroTimer";

const today = new Date().toISOString().split("T")[0];

export default function StudyPanel() {
  const {
    plans,
    loading,
    selectedDate,
    setSelectedDate,
    fetchPlans,
    createPlan,
    addTask,
    toggleTask,
    deleteTask,
    deletePlan,
  } = useStudyStore();

  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(selectedDate || today);
  const [newTaskTime, setNewTaskTime] = useState("19:00");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState("daily");
  const [priority, setPriority] = useState(1);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [showPomodoro, setShowPomodoro] = useState(false);

  useEffect(() => {
    void fetchPlans();
  }, []);

  useEffect(() => {
    setNewTaskDate(selectedDate);
  }, [selectedDate]);

  const handleClose = async () => {
    await getCurrentWindow().hide();
  };

  const handleCreatePlan = async () => {
    if (!newPlanTitle.trim()) return;
    await createPlan(newPlanTitle.trim(), null, selectedDate);
    setNewPlanTitle("");
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !activePlanId) return;

    const reminderAt =
      reminderEnabled && newTaskDate && newTaskTime
        ? `${newTaskDate} ${newTaskTime}:00`
        : null;

    await addTask(activePlanId, {
      title: newTaskTitle.trim(),
      notes: newTaskNotes.trim() || null,
      reminder_at: reminderAt,
      reminder_enabled: Boolean(reminderAt),
      is_recurring: isRecurring,
      recurrence: isRecurring ? recurrence : null,
      priority,
    });

    setNewTaskTitle("");
    setNewTaskNotes("");
    setReminderEnabled(true);
    setIsRecurring(false);
    setPriority(1);
  };

  const todayPlans = plans.filter((p) => p.plan_date === selectedDate);
  const totalTasks = todayPlans.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = todayPlans.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.is_done).length,
    0
  );

  return (
    <div className="w-[360px] h-[540px] glass rounded-2xl shadow-xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-white/20 drag-region">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-fluent-text">学习计划</h2>
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={() => setShowPomodoro(!showPomodoro)}
              className="text-xs px-2 py-1 rounded-lg bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors"
            >
              {showPomodoro ? "关闭番茄钟" : "番茄钟"}
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
        <div className="flex items-center gap-2 mt-2 no-drag">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg bg-white/50 border border-white/30 text-fluent-text"
          />
          <span className="text-xs text-fluent-muted">
            {doneTasks}/{totalTasks} 完成
          </span>
        </div>
      </div>

      {showPomodoro && (
        <div className="px-4 py-2 border-b border-white/20">
          <PomodoroTimer durationMinutes={25} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && (
          <div className="text-center text-fluent-muted text-sm py-4">加载中...</div>
        )}

        {todayPlans.length === 0 && !loading && (
          <div className="text-center text-fluent-muted text-sm py-4">
            当前日期还没有计划，先创建一个学习计划
          </div>
        )}

        {todayPlans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl bg-white/30 border border-white/20 p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                className="text-left text-sm font-medium text-fluent-text hover:text-primary-600 break-words"
                onClick={() =>
                  setActivePlanId(activePlanId === plan.id ? null : plan.id)
                }
              >
                {plan.title}
              </button>
              <button
                onClick={() => deletePlan(plan.id)}
                className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
              >
                删除
              </button>
            </div>

            {plan.tasks.length > 0 && (
              <div className="divide-y divide-white/20">
                {plan.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            )}

            {activePlanId === plan.id && (
              <div className="mt-3 space-y-2 border-t border-white/20 pt-3">
                <label className="block text-xs text-fluent-muted">
                  任务标题
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="例如：写数学作业"
                    className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg bg-white/60 border border-white/30 text-fluent-text placeholder:text-fluent-muted"
                  />
                </label>

                <label className="block text-xs text-fluent-muted">
                  备注
                  <textarea
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    placeholder="例如：完成第 3 章习题"
                    rows={2}
                    className="mt-1 w-full resize-none text-xs px-2 py-1.5 rounded-lg bg-white/60 border border-white/30 text-fluent-text placeholder:text-fluent-muted"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-fluent-muted">
                    计划日期
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg bg-white/60 border border-white/30 text-fluent-text"
                    />
                  </label>
                  <label className="block text-xs text-fluent-muted">
                    提醒时间
                    <input
                      type="time"
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      disabled={!reminderEnabled}
                      className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg bg-white/60 border border-white/30 text-fluent-text disabled:opacity-50"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-fluent-muted">
                    优先级
                    <select
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg bg-white/60 border border-white/30 text-fluent-text"
                    >
                      <option value={1}>普通</option>
                      <option value={2}>重要</option>
                      <option value={3}>紧急</option>
                    </select>
                  </label>
                  <label className="block text-xs text-fluent-muted">
                    重复规则
                    <select
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value)}
                      disabled={!isRecurring}
                      className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg bg-white/60 border border-white/30 text-fluent-text disabled:opacity-50"
                    >
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-4 text-xs text-fluent-text">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                    />
                    开启提醒
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                    />
                    重复提醒
                  </label>
                </div>

                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  添加学习任务
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-white/20">
        <div className="flex gap-1">
          <input
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleCreatePlan()}
            placeholder="新建学习计划..."
            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/50 border border-white/30 text-fluent-text placeholder:text-fluent-muted"
          />
          <button
            onClick={handleCreatePlan}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
