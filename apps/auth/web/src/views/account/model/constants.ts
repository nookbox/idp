import { House, ShieldCheck, MonitorSmartphone, Blocks } from 'lucide-react';

export const SECTIONS = [
  { key: 'overview', label: '개요', icon: House },
  { key: 'security', label: '보안', icon: ShieldCheck },
  { key: 'devices', label: '디바이스', icon: MonitorSmartphone },
  { key: 'services', label: '연결된 서비스', icon: Blocks },
] as const;
