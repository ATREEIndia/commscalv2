'use client';
import { itemprobes, taskprobs } from "./constants";
import Navbar from "./Components/Navbar";
import Rightcontainer from "./Components/Rightcontainer";
import { auth, firestore, listenToItems, listenToTasks } from "./firebase/firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useUsers } from "./constants";
import { format } from "date-fns";
import { doc, setDoc } from "firebase/firestore";
import Taskform from "./Components/Taskform";
import Viewdata from "./Components/Viewdata";
import { UserMyAppContext } from "./Context/MyAppContext";

// ─── Popup component for Overview Items ───────────────────────────────────────


function ItemsPopup({
  category,
  items,
  onClose,
}: {
  category: string;
  items: itemprobes[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative  w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 ">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="text-lg">📦</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">{category}</h2>
              <p className="text-xs text-gray-400">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm">No items in this category</p>
            </div>
          ) : (
            items.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                {/* Index badge */}
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <p onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                    className="font-semibold text-gray-800 text-sm truncate cursor-pointer hover:text-blue-700">
                    {item.title ?? "Untitled Item"}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {item.date && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {format(new Date(item.date), "dd MMM yyyy")}
                      </span>
                    )}
                    {item.category && (
                      <span className="inline-flex items-center text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    )}
                    {/* {item.location && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.location}
                      </span>
                    )} */}
                  </div>

                  {/* Description if any */}
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Popup component for Tasks ─────────────────────────────────────────────────
function TasksPopup({
  title,
  tasks,
  onClose,
  onSelectTask,
  icon,
  accentColor,
}: {
  title: string;
  tasks: taskprobs[];
  onClose: () => void;
  onSelectTask: (task: taskprobs) => void;
  icon: string;
  accentColor: string;
}) {
  const [search, setSearch] = useState("");


  const displayed = tasks.filter(
    (t) =>
      !search.trim() ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_to?.some((p) => p.toLowerCase().includes(search.toLowerCase()))
  );

  const getPriorityLevel = (deadline: string | undefined) => {
    if (!deadline) return "normal";
    const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (d < 0) return "overdue";
    if (d <= 2) return "urgent";
    if (d <= 5) return "high";
    return "normal";
  };

  const pConfig = {
    overdue: { dot: "bg-red-500", badge: "bg-red-100 text-red-600 border-red-200", label: "Overdue" },
    urgent: { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-600 border-orange-200", label: "Urgent" },
    high: { dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-600 border-yellow-200", label: "High" },
    normal: { dot: "bg-blue-400", badge: "bg-blue-50 text-blue-600 border-blue-200", label: "Normal" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 ">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center`}>
              <span className="text-lg">{icon}</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
              <p className="text-xs text-gray-400">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 w-full"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50 px-2">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-4xl mb-2">{search ? "🔍" : "🎉"}</p>
              <p className="text-sm font-medium text-gray-500">
                {search ? `No tasks match "${search}"` : "No tasks here"}
              </p>
            </div>
          ) : (
            displayed.map((task, i) => {
              const priority = getPriorityLevel(task.deadline);
              const pc = pConfig[priority];
              const completion = task.assigned_to?.length
                ? Math.round(((task.completed_by?.length ?? 0) / task.assigned_to.length) * 100)
                : 0;
              const daysLeft = task.deadline
                ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
                : null;

              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors rounded-xl group"
                  onClick={() => { onSelectTask(task); onClose(); }}
                >
                  {/* Priority dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${pc.dot}`} />

                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                        {task.title}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${pc.badge}`}>
                        {pc.label}
                      </span>
                      {task.category && (
                        <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          {task.category}
                        </span>
                      )}
                    </div>

                    {/* Deadline */}
                    {task.deadline && (
                      <p className={`text-xs mb-2 ${daysLeft !== null && daysLeft < 0 ? "text-red-500" : daysLeft !== null && daysLeft <= 3 ? "text-orange-500" : "text-gray-400"}`}>
                        {daysLeft !== null && daysLeft < 0
                          ? `${Math.abs(daysLeft)}d overdue`
                          : daysLeft === 0 ? "Due today"
                            : daysLeft === 1 ? "Due tomorrow"
                              : `Due ${format(new Date(task.deadline), "dd MMM yyyy")}`}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${completion === 100 ? "bg-emerald-500" : completion > 50 ? "bg-blue-500" : "bg-amber-400"}`}
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{completion}%</span>
                    </div>

                    {/* Assignees */}
                    <div className="flex flex-wrap gap-1.5">
                      {task.assigned_to?.map((person, j) => (
                        <span
                          key={j}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium ${task.completed_by?.includes(person)
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${task.completed_by?.includes(person) ? "bg-emerald-500" : "bg-amber-400"}`} />
                          {person.split("@")[0]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { users } = useUsers();
  const user_email_list = users.map((u) => u.email);

  const [current_task_user, Setcurrent_task_user] = useState("");
  const [items, Setitems] = useState<itemprobes[]>([]);
  const [tasks, Settasks] = useState<taskprobs[]>([]);
  const [filtered_tasks, Setfiltered_tasks] = useState<taskprobs[]>([]);
  const [itemcategories, Setitemcategories] = useState<string[]>([]);

  const [startDate, setStartDate] = useState(new Date("2025-05-30"));
  const [endDate, setEndDate] = useState(new Date());
  const [filered_items, Setfileterd_items] = useState<itemprobes[]>([]);

  const [iseditformopen, setIseditformopen] = useState(false);
  const [istaskformopen, setIstaskformopen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<taskprobs | null>(null);

  const [useremail, setUseremail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">("all");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Popup state ────────────────────────────────────────────────────────────
  // Overview item popup
  const [itemPopup, setItemPopup] = useState<{ category: string; items: itemprobes[] } | null>(null);

  // Stat-card task popup
  const [taskPopup, setTaskPopup] = useState<{
    title: string;
    tasks: taskprobs[];
    icon: string;
    accentColor: string;
  } | null>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const getStatusColor = (task: taskprobs, person: string) =>
    task.completed_by?.includes(person)
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const getPriorityLevel = (deadline: string | undefined) => {
    if (!deadline) return "normal";
    const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (d < 0) return "overdue";
    if (d <= 2) return "urgent";
    if (d <= 5) return "high";
    return "normal";
  };

  const priorityConfig = {
    overdue: { label: "Overdue", bg: "bg-red-100", text: "text-red-600", border: "border-red-200", dot: "bg-red-500" },
    urgent: { label: "Urgent", bg: "bg-orange-100", text: "text-orange-600", border: "border-orange-200", dot: "bg-orange-500" },
    high: { label: "High", bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200", dot: "bg-yellow-500" },
    normal: { label: "Normal", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", dot: "bg-blue-400" },
  };

  const getTaskCompletionRate = (task: taskprobs) =>
    task.assigned_to?.length
      ? Math.round(((task.completed_by?.length ?? 0) / task.assigned_to.length) * 100)
      : 0;

  // ─── Auth & Data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUseremail(user?.email ?? null);
      setUsername(user?.displayName ?? null);
    });
    listenToItems((data: itemprobes[]) => { Setitems(data); setIsLoading(false); });
    listenToTasks(Settasks);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cats = [...new Set(items?.map((i) => i.category || "Uncategorised") || [])];
    Setitemcategories(cats);
    getFilteredTasks();
  }, [items, tasks, current_task_user, activeTab, taskSearchQuery]);

  useEffect(() => {
    Setfileterd_items(
      items?.filter(
        (item) =>
          new Date(item.date) >= new Date(startDate) &&
          new Date(item.date) <= new Date(endDate)
      )
    );
  }, [items, startDate, endDate]);

  // ─── Filter Logic ───────────────────────────────────────────────────────────
  const getFilteredTasks = () => {
    let result = [...(tasks ?? [])].filter((t) => t.assigned_to?.length > 0);

    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assigned_to?.some((p) => p.toLowerCase().includes(q))
      );
    }

    if (activeTab === "pending")
      result = result.filter((t) => (t.completed_by?.length ?? 0) < (t.assigned_to?.length ?? 1));
    else if (activeTab === "completed")
      result = result.filter((t) => t.assigned_to?.every((p) => t.completed_by?.includes(p)));

    if (current_task_user.length > 3)
      result = result.filter((t) => t.assigned_to?.includes(current_task_user));

    result.sort(
      (a, b) =>
        new Date(b.date ?? b.createdon ?? 0).getTime() -
        new Date(a.date ?? a.createdon ?? 0).getTime()
    );
    Setfiltered_tasks(result);
  };

  // ─── Task CRUD ───────────────────────────────────────────────────────────────
  const addToTask = ({ deadline, title, description, url, assigned_to }: taskprobs) => {
    try {
      setDoc(doc(firestore, "tasks", title), {
        date: new Date().toISOString().split("T")[0],
        createdon: new Date().toISOString().split("T")[0],
        title, assigned_to, deadline, description, url,
        completed_by: [], current_status: "Working",
      }).then(() => alert("Task added successfully!"));
    } catch (e) { alert("Error: " + e); }
  };

  // ─── UI Handlers ────────────────────────────────────────────────────────────
  const manageeditform = (entry?: taskprobs) => {
    setIseditformopen((p) => !p);
    if (entry) setSelectedEntry(entry);
  };

  // ─── Stat cards config ──────────────────────────────────────────────────────
  const totalTasks = tasks.filter((t) => t.assigned_to?.length > 0).length;
  const pendingTasks = tasks.filter((t) => (t.completed_by?.length ?? 0) < (t.assigned_to?.length ?? 1));
  const completedTasks = tasks.filter((t) => t.assigned_to?.every((p) => t.completed_by?.includes(p)));
  const overdueTasks = tasks.filter(
    (t) =>
      t.deadline &&
      new Date(t.deadline) < new Date() &&
      (t.completed_by?.length ?? 0) < (t.assigned_to?.length ?? 1)
  );

  const statCards = [
    {
      label: "Total Tasks",
      value: totalTasks,
      tasks: tasks.filter((t) => t.assigned_to?.length > 0),
      icon: "📋", accentColor: "bg-blue-100",
      gradient: "from-blue-500 to-blue-600",
      light: "bg-blue-50", text: "text-blue-600",
    },
    {
      label: "Pending",
      value: pendingTasks.length,
      tasks: pendingTasks,
      icon: "⏳", accentColor: "bg-amber-100",
      gradient: "from-amber-500 to-orange-500",
      light: "bg-amber-50", text: "text-amber-600",
    },
    {
      label: "Completed",
      value: completedTasks.length,
      tasks: completedTasks,
      icon: "✅", accentColor: "bg-emerald-100",
      gradient: "from-emerald-500 to-green-600",
      light: "bg-emerald-50", text: "text-emerald-600",
    },
    {
      label: "Overdue",
      value: overdueTasks.length,
      tasks: overdueTasks,
      icon: "🚨", accentColor: "bg-red-100",
      gradient: "from-red-500 to-rose-600",
      light: "bg-red-50", text: "text-red-600",
    },
  ];
  const { user, loading, isRegUser } = UserMyAppContext()


  return (
    <main className="flex h-screen w-full bg-gray-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="hidden lg:block flex-shrink-0">
        <Navbar current_page="Dashboard" />
      </div>

      {/* ── Mobile Nav Overlay ── */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full  bg-white shadow-2xl z-10">
            <Navbar current_page="Dashboard" />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileNavOpen(true)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Dashboard</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {format(new Date(), "EEEE, dd MMMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
              {username?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{username ?? "Guest"}</p>
              <p className="text-xs text-gray-400 leading-tight truncate max-w-[140px]">{useremail ?? ""}</p>
            </div>
          </div>
        </header>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ── Stat Cards ── */}
          {isRegUser &&
            <section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 ">
                {statCards.map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] group"
                    onClick={() =>
                      setTaskPopup({
                        title: stat.label,
                        tasks: stat.tasks,
                        icon: stat.icon,
                        accentColor: stat.accentColor,
                      })
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">{stat.label}</p>
                        <p className={`text-2xl sm:text-3xl font-bold mt-1 ${stat.text}`}>{stat.value}</p>
                      </div>
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 ${stat.light} rounded-xl flex items-center justify-center text-lg sm:text-xl`}>
                        {stat.icon}
                      </div>
                    </div>
                    <div className="mt-3 w-full overflow-hidden bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5  rounded-full bg-gradient-to-r ${stat.gradient} transition-all duration-500`}
                        style={{ width: totalTasks ? `${(stat.value / totalTasks) * 100}%` : "0%" }}
                      />
                    </div>
                    {/* Click hint */}
                    <p className="text-xs text-gray-300 group-hover:text-indigo-400 mt-2 transition-colors text-right">
                      View all →
                    </p>
                  </div>
                ))}
              </div>
            </section>}

          {/* ── Overview / Items ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h2 className="font-semibold text-gray-800">Items Overview</h2>
                <span className="ml-1 bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {filered_items?.length ?? 0}
                </span>
              </div>

              {/* Date range */}
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                {[
                  { label: "From", value: startDate, setter: setStartDate },
                  { label: "To", value: endDate, setter: setEndDate },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                    <input
                      type="date"
                      value={formatDate(value)}
                      onChange={(e) => setter(new Date(e.target.value))}
                      className="text-sm text-gray-700 bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Category cards — each opens popup */}
            <div className="p-4 sm:p-5">
              {isLoading ? (
                <div className="flex gap-3 flex-wrap">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-28 h-24 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : itemcategories.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-4xl mb-2">📦</p>
                  <p className="text-sm">No items found in this date range</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {itemcategories.map((cat, index) => {
                    const catItems = filered_items?.filter((item) => item.category === cat) ?? [];
                    const colors = [
                      "from-blue-400 to-blue-600",
                      "from-purple-400 to-purple-600",
                      "from-emerald-400 to-emerald-600",
                      "from-amber-400 to-amber-600",
                      "from-rose-400 to-rose-600",
                      "from-cyan-400 to-cyan-600",
                    ];
                    return (
                      <div
                        key={index}
                        className={`relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${colors[index % colors.length]} text-white shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer min-w-[100px] group`}
                        onClick={() => setItemPopup({ category: cat, items: catItems })}
                      >
                        <span className="text-2xl sm:text-3xl font-bold">{catItems.length}</span>
                        <span className="text-xs sm:text-sm mt-1 text-white/90 text-center leading-tight">{cat}</span>
                        {/* Hover hint */}
                        <span className="absolute bottom-1.5 right-2.5 text-[10px] text-white/60 group-hover:text-white/90 transition-colors">
                          view →
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>


          <div className="hidden">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-gray-100 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-500 rounded-full" />
                  <h2 className="font-semibold text-gray-800">Instructions</h2>

                </div>
                




              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-gray-100 gap-3" >
                  
                </div>
            </section>
          </div>






          {/* ── Tasks Section ── */}
          {isRegUser &&
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">

              {/* Tasks header */}
              <div className="flex flex-col gap-3 p-4 sm:p-5 border-b border-gray-100">

                {/* Row 1 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                    <h2 className="font-semibold text-gray-800">Tasks</h2>
                    <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {filtered_tasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setIstaskformopen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden xs:inline">Add Task</span>
                  </button>
                </div>

                {/* Row 2: search + user filter */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Search */}
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search tasks by title, description or assignee…"
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      className="bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 w-full"
                    />
                    {taskSearchQuery && (
                      <button onClick={() => setTaskSearchQuery("")} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* User filter */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <select
                      className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
                      onChange={(e) => Setcurrent_task_user(e.target.value)}
                      value={current_task_user}
                    >
                      <option value="">All Members</option>
                      {user_email_list.map((email, i) => (
                        <option key={i} value={email}>{email}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active search tag */}
                {taskSearchQuery && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Results for:</span>
                    <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {taskSearchQuery}
                      <button onClick={() => setTaskSearchQuery("")} className="hover:text-indigo-900 transition-colors ml-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                    <span className="text-xs text-gray-400">
                      {filtered_tasks.length} result{filtered_tasks.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-4 sm:px-5 pt-3 border-b border-gray-100">
                {(["all", "pending", "completed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors border-b-2 -mb-px ${activeTab === tab
                      ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Task list */}
              <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                {filtered_tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <p className="text-5xl mb-3">{taskSearchQuery ? "🔍" : "🎉"}</p>
                    <p className="font-medium text-gray-500">
                      {taskSearchQuery ? `No tasks match "${taskSearchQuery}"` : "No tasks found"}
                    </p>
                    <p className="text-sm mt-1">
                      {taskSearchQuery ? "Try a different search term" : activeTab !== "all" ? "Try switching tabs" : 'Click "Add Task" to get started'}
                    </p>
                  </div>
                ) : (
                  filtered_tasks.map((task, index) => {
                    const priority = getPriorityLevel(task.deadline);
                    const pConf = priorityConfig[priority];
                    const completion = getTaskCompletionRate(task);
                    const daysLeft = task.deadline
                      ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
                      : null;

                    return (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-gray-50/80 cursor-pointer transition-colors group"
                        onClick={() => manageeditform(task)}
                      >
                        <div className="flex-shrink-0 pt-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${pConf.dot}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base group-hover:text-indigo-600 transition-colors truncate">
                              {task.title}
                            </h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${task.current_status == "Posted" ? "hidden" : "flex"}  ${pConf.bg} ${pConf.text} ${pConf.border} flex-shrink-0`}>
                              {pConf.label}
                            </span>
                            {task.category && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 flex-shrink-0">
                                {task.category}
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-1">{task.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                            {task.date && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {format(new Date(task.date), "dd MMM yyyy")}
                              </div>
                            )}
                            {task.deadline && (
                              <div className={` items-center gap-1 text-xs font-medium ${task.current_status == "Posted" ? "hidden" : "flex"} ${daysLeft !== null && daysLeft < 0 ? "text-red-500" : daysLeft !== null && daysLeft <= 3 ? "text-orange-500" : "text-gray-400"}`}>

                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {daysLeft !== null && daysLeft < 0
                                  ? `${Math.abs(daysLeft)}d overdue`
                                  : daysLeft === 0 ? "Due today"
                                    : daysLeft === 1 ? "Due tomorrow"
                                      : `Due ${format(new Date(task.deadline), "dd MMM")}`}
                              </div>
                            )}
                          </div>

                          {/* <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">Progress</span>
                            <span className="text-xs font-medium text-gray-600">{completion}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${completion === 100 ? "bg-emerald-500" : completion > 50 ? "bg-blue-500" : "bg-amber-400"}`}
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                        </div> */}

                          <div className="flex flex-wrap gap-1.5">
                            {task.assigned_to?.map((person, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium ${getStatusColor(task, person)}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${task.completed_by?.includes(person) ? "bg-emerald-500" : "bg-amber-400"}`} />
                                {person.split("@")[0]}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="hidden sm:flex flex-shrink-0 items-center">
                          <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>}

        </div>
      </div>

      {/* ── Right Container ── */}
      <div className="hidden xl:block flex-shrink-0">
        <Rightcontainer />
      </div>

      {/* ── Add Task Modal ── */}
      {istaskformopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIstaskformopen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <Taskform changeformvisibility={() => setIstaskformopen(false)} />
          </div>
        </div>
      )}

      {/* ── View / Edit Task Modal ── */}
      {iseditformopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => manageeditform()} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <Viewdata changeformvisibility={manageeditform} selectedEntry={selectedEntry} />
          </div>
        </div>
      )}

      {/* ── Overview Items Popup ── */}
      {itemPopup && (
        <ItemsPopup
          category={itemPopup.category}
          items={itemPopup.items}
          onClose={() => setItemPopup(null)}
        />
      )}

      {/* ── Stat-card Tasks Popup ── */}
      {taskPopup && (
        <TasksPopup
          title={taskPopup.title}
          tasks={taskPopup.tasks}
          icon={taskPopup.icon}
          accentColor={taskPopup.accentColor}
          onClose={() => setTaskPopup(null)}
          onSelectTask={(task) => {
            setTaskPopup(null);
            manageeditform(task);
          }}
        />
      )}



    </main>
  );
}