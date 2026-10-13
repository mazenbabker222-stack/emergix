import { BookOpen, ClipboardCheck, FileText, Headphones, HeartPulse, Play, ShieldCheck, Video } from 'lucide-react';

export const modules = [
  { icon: Play, title: 'Common Presentations in A&E', description: 'History, examination and management of common A&E presentations.', color: '#0A84FF', image: '/brand/t1.jpg', href: '/courses' },
  { icon: FileText, title: 'OSCE Practice Cases', description: 'Interactive stations with an AI examiner and detailed feedback.', color: '#7C3AED', image: '/brand/t2.jpg', href: '/practice' },
  { icon: BookOpen, title: 'Clinical Guidelines', description: 'Links to NICE, SIGN and current evidence-based guidelines.', color: '#16A34A', image: '/brand/t3.jpg', href: '/resources' },
  { icon: Video, title: 'Live Teaching Sessions', description: '1-to-1 or group sessions with expert examiners.', color: '#0D9488', image: '/brand/t4.jpg', href: '/contact' },
  { icon: HeartPulse, title: 'Progress & Feedback', description: 'Detailed reports, marking and personalised improvement tips.', color: '#DB2777', image: '/brand/t5.jpg', href: '/practice' },
  { icon: ShieldCheck, title: 'Student Resources', description: 'Downloadable notes, checklists, posters and key references.', color: '#4F46E5', image: '/brand/t6.jpg', href: '/resources' },
];

export const features = [
  { icon: Video, title: 'Teaching Videos', text: 'Realistic A&E scenarios and expert-led teaching videos.' },
  { icon: BookOpen, title: 'Reading & Literature', text: 'Key guidelines, articles and study materials before you practise.' },
  { icon: ClipboardCheck, title: 'AI Examiner Practice', text: 'Simulate OSCE stations with AI and get instant, adaptive feedback.' },
  { icon: Headphones, title: '1-to-1 Examiner Sessions', text: 'Live case discussions with an examiner via video.' },
  { icon: Video, title: 'Video Conferencing', text: 'Join live sessions, ask questions and receive guidance.' },
  { icon: HeartPulse, title: 'Progress Tracking', text: 'Monitor your performance, marking and development.' },
  { icon: ShieldCheck, title: 'Secure Student Access', text: 'Password-protected accounts and easy administration.' },
];
