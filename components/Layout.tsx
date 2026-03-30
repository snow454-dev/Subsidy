import React from 'react';
import { Mountain, CheckCircle, FileText, Search, MapPin } from 'lucide-react';
import { AppStep } from '../types';

interface LayoutProps {
  currentStep: AppStep;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentStep, children }) => {
  const steps = [
    { id: AppStep.PROFILE_INPUT, label: '企業情報入力', icon: <Mountain size={20} /> },
    { id: AppStep.SUBSIDY_SELECTION, label: '補助金選定', icon: <Search size={20} /> },
    { id: AppStep.PLAN_DRAFTING, label: '計画骨子作成', icon: <FileText size={20} /> },
    { id: AppStep.CHECKLIST, label: '要件チェック', icon: <CheckCircle size={20} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MapPin size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">道東・札幌特化型</h1>
              <span className="text-xs text-slate-400">補助金AIコンサルタント</span>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isCompleted
                    ? 'text-slate-300 bg-slate-800/50'
                    : 'text-slate-500'
                }`}
              >
                <div className={`${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-500'}`}>
                  {isCompleted ? <CheckCircle size={20} /> : step.icon}
                </div>
                <span className="font-medium text-sm">{step.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-slate-800 rounded-xl p-4 text-xs text-slate-400 border border-slate-700">
            <p className="mb-2 font-semibold text-slate-300">免責事項</p>
            当AIは情報提供を目的としています。法務・税務に関する確定的な判断や申請代行は行いません。最終確認は必ず公募要領をご確認ください。
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-xl">
              {steps.find(s => s.id === currentStep)?.label}
            </h2>
            <div className="flex items-center gap-2">
               <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">道東エリア (Doto)</span>
               <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">札幌市 (Sapporo)</span>
            </div>
        </header>
        <div className="p-6 md:p-10 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};