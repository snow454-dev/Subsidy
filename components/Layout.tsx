import React from 'react';
import { AppStep } from '../types';
import { Edit3, Search, FileText, CheckCircle, MapPin } from 'lucide-react';

// AppStepの定義に合わせてサイドバーのメニューを作成
const steps = [
  { id: AppStep.PROFILE_INPUT, label: '企業情報入力', icon: <Edit3 size={18} /> },
  { id: AppStep.SUBSIDY_SELECTION, label: '補助金選定', icon: <Search size={18} /> },
  { id: AppStep.PLAN_DRAFTING, label: '計画骨子作成', icon: <FileText size={18} /> },
  { id: AppStep.CHECKLIST, label: '要件チェック', icon: <CheckCircle size={18} /> },
];

// 【変更点1】 propsに profile を追加して、App.tsxからデータを受け取れるようにする
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
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex no-print">
        <div className="p-6 border-b border-slate-800">
          {/* 【変更点2】 タイトルを全国対応型に変更 */}
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="text-blue-500" size={24} />
            全国対応型
          </h1>
          <p className="text-xs text-slate-400 mt-1">補助金AIコンサルタント</p>
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-xl">
            {steps.find(s => s.id === currentStep)?.label}
          </h2>
          
          {/* 【変更点3】 右上のバッジを動的に変更！ */}
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
              {/* profile.location があればそれを表示、なければ「エリア未設定」と表示 */}
              {profile?.location ? profile.location : 'エリア未設定'}
            </span>
            <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
              {/* profile.industry があればそれを表示、なければ「業種未設定」と表示 */}
              {profile?.industry ? profile.industry : '業種未設定'}
            </span>
          </div>
        </header>
        <div className="p-6 md:p-10 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
