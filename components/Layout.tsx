import React from 'react';
import { AppStep } from '../types';
import { Edit3, Search, FileText, CheckCircle, MapPin } from 'lucide-react';

// ロゴSVGコンポーネント（インライン定義）
const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoBg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
      <linearGradient id="arrowGrad" x1="60" y1="85" x2="60" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="docGrad" x1="30" y1="25" x2="80" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="112" height="112" rx="24" fill="url(#logoBg)" />
    <path d="M63 22L78 37V81C78 83.7614 75.7614 86 73 86H33C30.2386 86 28 83.7614 28 81V27C28 24.2386 30.2386 22 33 22H63Z" fill="url(#docGrad)" />
    <path d="M63 22V37H78" fill="none" stroke="#93A3D1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="36" y1="46" x2="62" y2="46" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="36" y1="55" x2="70" y2="55" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="36" y1="64" x2="58" y2="64" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="36" y1="73" x2="66" y2="73" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="74" cy="82" r="16" fill="#10B981" stroke="#064E3B" strokeWidth="1" />
    <path d="M66 82L72 88L84 76" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M82 50L82 28L94 28" stroke="url(#arrowGrad)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M72 60L82 28" stroke="url(#arrowGrad)" strokeWidth="5" strokeLinecap="round" />
    <circle cx="24" cy="30" r="12" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
    <text x="24" y="35" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#92400E" fontFamily="sans-serif">¥</text>
  </svg>
);

const steps = [
  { id: AppStep.PROFILE_INPUT, label: '企業情報入力', icon: <Edit3 size={18} /> },
  { id: AppStep.SUBSIDY_SELECTION, label: '補助金選定', icon: <Search size={18} /> },
  { id: AppStep.PLAN_DRAFTING, label: '計画骨子作成', icon: <FileText size={18} /> },
  { id: AppStep.CHECKLIST, label: '要件チェック', icon: <CheckCircle size={18} /> },
];

interface LayoutProps {
  currentStep: AppStep;
  children: React.ReactNode;
  profile?: {
    location?: string;
    industry?: string;
    [key: string]: any;
  };
}

export const Layout: React.FC<LayoutProps> = ({ currentStep, children, profile }) => {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans">
      {/* ===== PC用サイドバー ===== */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col hidden md:flex no-print flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">補助金AI</h1>
              <p className="text-[11px] text-slate-400">パートナー（全国対応）</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-4">
            {steps.map((s) => {
              const isActive = s.id === currentStep;
              return (
                <li key={s.id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white font-medium' 
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {s.icon}
                    <span className="text-sm">{s.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 m-4 bg-slate-800 rounded-lg">
          <p className="text-xs font-bold text-white mb-2">免責事項</p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            当AIは情報提供を目的としています。法務・税務に関する確定的な判断や申請代行は行いません。最終確認は必ず公募要領をご確認ください。
          </p>
        </div>
      </aside>

      {/* ===== メインコンテンツ ===== */}
      <main className="flex-1 overflow-y-auto">
        {/* ヘッダー */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 sm:px-6 py-3 sm:py-4 no-print">
          {/* モバイル: ロゴ＋タイトル行 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* モバイルのみロゴ表示（PCはサイドバーにあるので非表示） */}
              <div className="md:hidden">
                <Logo size={32} />
              </div>
              <h2 className="font-bold text-slate-800 text-base sm:text-xl">
                {steps.find(s => s.id === currentStep)?.label ?? '補助金AIパートナー'}
              </h2>
            </div>
            
            {/* エリア・業種バッジ（モバイルでは非表示） */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                {profile?.location ? profile.location : 'エリア未設定'}
              </span>
              <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
                {profile?.industry ? profile.industry : '業種未設定'}
              </span>
            </div>
          </div>

          {/* モバイル: エリア・業種バッジ（2行目に表示） */}
          <div className="flex sm:hidden items-center gap-2 mt-2">
            <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded-full font-medium truncate max-w-[45%]">
              {profile?.location ? profile.location : 'エリア未設定'}
            </span>
            <span className="bg-green-100 text-green-800 text-[11px] px-2 py-0.5 rounded-full font-medium truncate max-w-[45%]">
              {profile?.industry ? profile.industry : '業種未設定'}
            </span>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
