import { useEffect, useState } from "react";
import { useStudyStore } from "@/stores/studyStore";
import TaskItem from "./TaskItem";
import PomodoroTimer from "./PomodoroTimer";

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
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [showPomodoro, setShowPomodoro] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlanTitle.trim()) return;
    await createPlan(newPlanTitle.trim(), null, selectedDate);
    setNewPlanTitle("");
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !activePlanId) return;
    await addTask(activePlanId, newTaskTitle.trim());
    setNewTaskTitle("");
  };

  const todayPlans = plans.filter((p) => p.plan_date === selectedDate);
  const totalTasks = todayPlans.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = todayPlans.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.is_done).length,
    0
  );

  return (
    <div className="w-80 h-[500px] glass rounded-2xl shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-fluent-text">学习计划</h2>
          <button
            onClick={() => setShowPomodoro(!showPomodoro)}
            className="text-xs px-2 py-1 rounded-lg bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors"
          >
            {showPomodoro ? "关闭番茄钟" : "番茄钟"}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
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

      {/* Pomodoro timer */}
      {showPomodoro && (
        <div className="px-4 py-2 border-b border-white/20">
          <PomodoroTimer durationMinutes={25} />
        </div>
      )}

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {todayPlans.length === 0 && !loading && (
          <div className="text-center text-fluent-muted text-sm py-4">
            今天还没有计划，创建一个吧
          </div>
        )}

        {todayPlans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl bg-white/30 border border-white/20 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-sm font-medium text-fluent-text cursor-pointer"
                onClick={() =>
                  setActivePlanId(activePlanId === plan.id ? null : plan.id)
                }
              >
                {plan.title}
              </h3>
              <button
                onClick={() => deletePlan(plan.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                删除
              </button>
            </div>

            {plan.tasks.length > 0 && (
              <div className="space-y-0.5">
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

            {/* Add task input */}
            {activePlanId === plan.id && (
              <div className="flex gap-1 mt-2">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="添加任务..."
                  className="flex-1 text-xs px-2 py-1 rounded-lg bg-white/50 border border-white/30 text-fluent-text placeholder:text-fluent-muted"
                />
                <button
                  onClick={handleAddTask}
                  className="text-xs px-2 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                >
                  +
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create plan */}
      <div className="px-3 py-2 border-t border-white/20">
        <div className="flex gap-1">
          <input
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreatePlan()}
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
