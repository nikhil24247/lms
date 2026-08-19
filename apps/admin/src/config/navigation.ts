import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  GraduationCap,
  Library,
  FileText,
  Users,
  BarChart3,
  ClipboardCheck,
  Trophy,
  Award,
  MessageSquare,
  Bell,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Primary destinations — shown in mobile bottom bar and top of sidebar */
export const adminPrimaryNav: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/trainings', icon: GraduationCap, label: 'Training' },
  { to: '/content-library', icon: Library, label: 'Content' },
  { to: '/training-reports', icon: FileText, label: 'Reports' },
];

/** Secondary — "More" menu (engagement & settings) */
export const adminMoreNav: NavItem[] = [
  { to: '/users', icon: Users, label: 'People' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/reports', icon: FileText, label: 'Audit & exports' },
  { to: '/assessments', icon: ClipboardCheck, label: 'Grading' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/recognition', icon: Award, label: 'Badges & points' },
  { to: '/certificates', icon: Award, label: 'Certificates' },
  { to: '/community', icon: MessageSquare, label: 'Community' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];
