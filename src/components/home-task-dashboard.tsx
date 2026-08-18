"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { DemoCareTask } from "@/lib/demo-data";
import type { ElderlyProfile } from "@/types/elderly";
import styles from "@/components/home-task-dashboard.module.css";

interface HomeTaskDashboardProps {
  tasks: DemoCareTask[];
  elders: ElderlyProfile[];
}

type TaskStatus = ReturnType<typeof formatOverdueLabel>;

interface TaskItem {
  task: DemoCareTask;
  elder: ElderlyProfile;
  status: TaskStatus;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
}

function formatOverdueLabel(dueAt: string): { label: string; tone: "overdue" | "soon" | "normal" } {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(Math.abs(diffMs) / 36e5);

  if (diffMs < 0) {
    if (diffHours >= 24) {
      const days = Math.max(Math.round(diffHours / 24), 1);
      return { label: `已逾期${days}天`, tone: "overdue" };
    }

    return { label: `已逾期${Math.max(diffHours, 1)}h`, tone: "overdue" };
  }

  if (diffMs <= 4 * 36e5) {
    return { label: `逾期剩餘${Math.max(diffHours, 1)}h`, tone: "soon" };
  }

  return { label: "待完成", tone: "normal" };
}

const DEFAULT_TODAY_TASK_ID = "task-chan-noon";
const DEMO_SHOW_ACHIEVEMENT_KEY = "demo:show-achievement";

const elderAvatarSrcByKey: Record<string, string> = {
  sunflower: "/assets/profile/向日葵 icon.svg",
  daisy: "/assets/profile/小雛菊 icon.svg",
  sakura: "/assets/profile/櫻花 icon.svg",
  peony: "/assets/profile/牡丹 icon.svg",
  lavender: "/assets/profile/薰衣草 icon.svg",
  tulip: "/assets/profile/鬱金香 icon.svg",
  calla: "/assets/profile/馬蹄蓮 icon.svg"
};

function getElderAvatarSrc(elder: ElderlyProfile): string {
  if (!elder.avatar) {
    return elderAvatarSrcByKey.sunflower;
  }

  return elderAvatarSrcByKey[elder.avatar] ?? elder.avatar;
}

export function HomeTaskDashboard({ tasks, elders }: HomeTaskDashboardProps) {
  const [showAchievement, setShowAchievement] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState(() => {
    const todayIndex = new Date().getDay();
    return todayIndex === 0 ? 6 : todayIndex - 1;
  });
  const weekDays = useMemo(() => {
    const today = new Date();
    const todayIndex = today.getDay();
    const mondayOffset = todayIndex === 0 ? -6 : 1 - todayIndex;
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset);

    return ["一", "二", "三", "四", "五", "六", "日"].map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return { day, date: date.getDate() };
    });
  }, []);

  useEffect(() => {
    window.localStorage.removeItem("demo:today-completed");
    window.localStorage.removeItem("demo:last-completed-task-id");
    window.localStorage.removeItem("demo:completed-at");
    tasks.forEach((task) => window.localStorage.removeItem(`care-task-completed:${task.id}`));

    setShowAchievement(window.localStorage.getItem(DEMO_SHOW_ACHIEVEMENT_KEY) === "1");
  }, [tasks]);

  function handleCloseAchievement() {
    window.localStorage.removeItem(DEMO_SHOW_ACHIEVEMENT_KEY);
    setShowAchievement(false);
  }

  const taskItems = useMemo<TaskItem[]>(
    () =>
      tasks
        .map((task) => ({
          task,
          elder: elders.find((item) => item.id === task.elderId) ?? null,
          status: formatOverdueLabel(task.dueAt)
        }))
        .filter((item): item is TaskItem => Boolean(item.elder)),
    [elders, tasks]
  );

  const defaultTodayTask = taskItems.find((item) => item.task.id === DEFAULT_TODAY_TASK_ID) ?? taskItems[0] ?? null;
  const todayTask = defaultTodayTask;
  const unfinishedTasks = taskItems.filter((item) => item.task.id !== DEFAULT_TODAY_TASK_ID);

  return (
    <section className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <p className={styles.greeting}>早晨，Joey!</p>
          <div className={styles.weekRow} aria-label="本週日期">
            {weekDays.map(({ day, date }, index) => (
              <button
                key={`${day}-${date}`}
                type="button"
                className={index === selectedDateIndex ? styles.dayActive : styles.day}
                onClick={() => setSelectedDateIndex(index)}
                aria-pressed={index === selectedDateIndex}
                aria-label={`選擇 ${date} 日，星期${day}`}
              >
                <small>{day}</small>
                <strong>{date}</strong>
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>今日的任務</h2>
        <div className={styles.primaryList}>
          {todayTask ? (
            <Link
              key={todayTask.task.id}
              className={styles.taskCard}
              href={`/report/${todayTask.elder.id}/modules?taskId=${todayTask.task.id}`}
            >
              <div className={styles.avatar}>
                <Image src={getElderAvatarSrc(todayTask.elder)} alt="" width={76} height={76} />
              </div>
              <div className={styles.taskMain}>
                <div className={styles.taskTop}>
                  <h3>{todayTask.elder.fullName}</h3>
                  <span>單號: {todayTask.elder.orderNo ?? todayTask.elder.roomNo}</span>
                </div>
                <p>{formatTime(todayTask.task.scheduledAt)}</p>
              </div>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <div className={styles.emptyCard}>暫無今日任務</div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>未完成事項</h2>
        <div className={styles.secondaryList}>
          {unfinishedTasks.map(({ task, elder, status }) => (
            <Link key={task.id} className={styles.miniCard} href={`/report/${elder.id}/modules?taskId=${task.id}`}>
              <div className={styles.miniAvatar}>
                <Image src={getElderAvatarSrc(elder)} alt="" width={64} height={64} />
              </div>
              <div className={styles.miniMain}>
                <strong>{elder.fullName}</strong>
                <span>{status.label}</span>
              </div>
              <span className={status.tone === "overdue" ? styles.overduePill : styles.soonPill}>
                {status.tone === "overdue" ? "已逾期" : "即將逾期"}
              </span>
            </Link>
          ))}
          {!unfinishedTasks.length ? <div className={styles.emptyCard}>暫無未完成事項</div> : null}
        </div>
      </section>

      {showAchievement ? (
        <div className={styles.achievementOverlay} role="dialog" aria-modal="true" aria-labelledby="first-achievement-title">
          <div className={styles.achievementDialog}>
            <div className={styles.speechWrap}>
              <Image className={styles.speechBubble} src="/assets/images/speech-bubble.svg" alt="" width={240} height={137} />
              <p id="first-achievement-title">恭喜你完成第一次記錄任務!</p>
            </div>

            <div className={styles.gifWrap}>
              <Image
                className={styles.achievementGif}
                src="/assets/gif/award_once.gif"
                alt=""
                width={266}
                height={276}
                unoptimized
              />
            </div>

            <div className={styles.achievementCard}>
              <p className={styles.achievementText}>可以去我的查看勳章獲得情況哦</p>
              <button type="button" onClick={handleCloseAchievement}>
                知道啦
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className={styles.bottomNav} aria-label="主導航">
        <Link className={styles.navActive} href="/">
          <Image className={styles.navIcon} src="/assets/icons/home_selected.svg" alt="" width={24} height={24} />
          首頁
        </Link>
        <Link href="/attendance-reports">
          <Image className={styles.navIcon} src="/assets/icons/report.svg" alt="" width={24} height={24} />
          報告
        </Link>
        <Link href="/profile">
          <Image className={styles.navIcon} src="/assets/icons/me.svg" alt="" width={24} height={24} />
          我的
        </Link>
      </nav>
    </section>
  );
}
