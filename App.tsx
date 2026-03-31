import React, { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AppStep, UserProfile, GeminiResponse } from './types';
import { fetchSubsidies, generateDraft, generateChecklist, fetchSubsidyDetails } from './services/geminiService';
import { getSelectionPrompt, getDraftingPrompt, getChecklistPrompt, getDetailsPrompt } from './constants';
import { Spinner } from './components/Spinner';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ArrowRight, ArrowLeft, Edit3, RefreshCw, ExternalLink, FileText, CheckCircle, Printer, Download, Info } from 'lucide-react';

// 日本標準産業分類ベースの業種リスト（サジェスト用）
const INDUSTRIES = [
  "農業・林業・漁業",
  "建設業",
  "製造業",
  "情報通信業",
  "運輸業・郵便業",
  "卸売業・小売業",
  "金融・保険業",
  "不動産・物品賃貸業",
  "宿泊業・飲食サービス業",
  "医療・福祉",
  "教育・学習支援業",
  "サービス業（その他）"
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.TERMS_AGREEMENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
　const [isAgreed, setIsAgreed] = useState(false);
  
  const initialProfile: UserProfile = {
    industry: '', // 追加: 業種
    companyDescription: '',
    location: '',
    employeeCount: '',
    goals: '',
    challenges: '',
  };

  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [subsidyResult, setSubsidyResult] = useState<GeminiResponse | null>(null);
  const [selectedSubsidyName, setSelectedSubsidyName] = useState<string>('');
  const [subsidyDetails, setSubsidyDetails] = useState<string>('');
  const [draftResult, setDraftResult] = useState<string>('');
  const [checklistResult, setChecklistResult] = useState<string>('');

  const resultContainerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultContainerRef.current) {
      resultContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [subsidyResult, draftResult, checklistResult]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // スプレッドシート（GAS）へのデータ送信処理
  const saveDataToSpreadsheet = (data: UserProfile) => {
    // ※ここにGASでデプロイしたウェブアプリのURLを設定してください
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzPq7Nd28yJh-Y70Xtw2KHX0Z8hR7FniNppufGCJwn3T-Ny9jNU1T-i9neiSTXnOAOmcA/exec"; 
    
    // URLが未設定の場合は送信をスキップ（ローカルテスト時のエラー防止）
    if (GAS_URL === "YOUR_GAS_WEB_APP_URL_HERE") return;

    fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...data
      })
    }).catch(console.error);
  };

  const submitProfile = async () => {
    setError(null);
    if (!profile.industry.trim() || !profile.location.trim() || !profile.companyDescription.trim()) {
      setError("業種、所在地、事業内容は必須入力です。");
      return;
    }

    setLoading(true);
    try {
      // DB（スプレッドシート）へのバックグラウンド保存
      saveDataToSpreadsheet(profile);

      // プロンプトに業種を追加してGeminiへリクエスト
      const prompt = getSelectionPrompt(
        profile.industry,
        profile.companyDescription,
        profile.location,
        profile.employeeCount,
        profile.goals,
        profile.challenges
      );
      const response = await fetchSubsidies(prompt);
      setSubsidyResult(response);
      setStep(AppStep.SUBSIDY_SELECTION);
    } catch (e) {
      setError("AIとの通信に失敗しました。再試行してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDetails = async () => {
    if (!selectedSubsidyName.trim()) {
      setError("詳細を確認する補助金名を入力またはコピーしてください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = getDetailsPrompt(selectedSubsidyName);
      const response = await fetchSubsidyDetails(prompt);
      setSubsidyDetails(response.text);
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError("詳細情報の取得中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleSubsidySelection = async () => {
    if (!selectedSubsidyName.trim()) {
      setError("対象とする補助金名を選択してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = getDraftingPrompt(selectedSubsidyName, profile.companyDescription);
      const response = await generateDraft(prompt);
      setDraftResult(response.text);
      setStep(AppStep.PLAN_DRAFTING);
    } catch (e) {
      setError("骨子の作成中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleDraftApproval = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = getChecklistPrompt(selectedSubsidyName);
      const response = await generateChecklist(prompt);
      setChecklistResult(response.text);
      setStep(AppStep.CHECKLIST);
    } catch (e) {
      setError("チェックリストの作成中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetApp = () => {
    if (window.confirm("全ての入力データと生成結果を消去し、最初に戻りますか？")) {
      setProfile(initialProfile);
      setSubsidyResult(null);
      setSelectedSubsidyName('');
      setSubsidyDetails('');
      setDraftResult('');
      setChecklistResult('');
      setError(null);
      setStep(AppStep.PROFILE_INPUT);
    }
  };

  const handleBack = () => {
    if (step === AppStep.SUBSIDY_SELECTION) setStep(AppStep.PROFILE_INPUT);
    else if (step === AppStep.PLAN_DRAFTING) setStep(AppStep.SUBSIDY_SELECTION);
    else if (step === AppStep.CHECKLIST) setStep(AppStep.PLAN_DRAFTING);
  };

  return (
    <Layout currentStep={step} profile={profile}>
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200 flex items-center justify-between no-print animate-in fade-in zoom-in">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-xl font-bold">&times;</button>
        </div>
      )}

      {step === AppStep.PROFILE_INPUT && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Edit3 size={20} className="text-blue-600"/>
              企業情報入力 (全国対応)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">業種 (必須)</label>
                <input
                  type="text"
                  name="industry"
                  list="industry-list"
                  placeholder="入力または一覧から選択"
                  value={profile.industry}
                  onChange={handleProfileChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
                <datalist id="industry-list">
                  {INDUSTRIES.map(ind => <option key={ind} value={ind} />)}
                </datalist>
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">所在地 (必須)</label>
                <input
                  type="text"
                  name="location"
                  placeholder="例: 東京都 港区、大阪府 吹田市など"
                  value={profile.location}
                  onChange={handleProfileChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">従業員数・事業形態</label>
                <input
                  type="text"
                  name="employeeCount"
                  placeholder="例: 個人事業主、正社員5名 など"
                  value={profile.employeeCount}
                  onChange={handleProfileChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">事業内容 (必須)</label>
                <textarea
                  name="companyDescription"
                  placeholder="具体的にどのような事業を行っていますか？"
                  rows={3}
                  value={profile.companyDescription}
                  onChange={handleProfileChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">現在の経営課題・目標</label>
                <textarea
                  name="goals"
                  placeholder="補助金を使って解決したいこと（具体的数値案など）"
                  rows={3}
                  value={profile.goals}
                  onChange={handleProfileChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={submitProfile}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-lg shadow-lg flex items-center gap-3 transition-all transform active:scale-95 disabled:bg-slate-400"
            >
              {loading ? <Spinner /> : "AIアドバイザーによる事業診断を開始する"}
              {!loading && <ArrowRight size={20} />}
            </button>
          </div>
        </div>
      )}

      {step === AppStep.SUBSIDY_SELECTION && (
        <div className="space-y-6" ref={resultContainerRef}>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">AIアドバイザーによる事業診断 & 補助金提案</h3>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-6 min-h-[100px]">
              {subsidyResult?.text ? (
                <MarkdownRenderer content={subsidyResult.text} />
              ) : (
                <p className="text-slate-500 italic">診断結果を生成しています...</p>
              )}
              {subsidyResult?.groundingChunks?.length ? (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 mb-2">関連ソース:</p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    {subsidyResult.groundingChunks.map((c, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <ExternalLink size={12}/>
                        <a href={c.web?.uri} target="_blank" rel="noopener noreferrer" className="hover:underline">{c.web?.title}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 no-print">
              <label className="block text-sm font-bold text-blue-900 mb-2">
                検討を進める補助金名を入力してください
              </label>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={selectedSubsidyName}
                  onChange={e => setSelectedSubsidyName(e.target.value)}
                  className="w-full p-3 border border-blue-200 rounded-lg"
                  placeholder="例: ものづくり補助金、IT導入補助金など"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleFetchDetails}
                    disabled={loading || !selectedSubsidyName.trim()}
                    className="flex-1 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-slate-200"
                  >
                    {loading ? <Spinner /> : <><Info size={18}/> 詳細要件を確認</>}
                  </button>
                  <button
                    onClick={handleSubsidySelection}
                    disabled={loading || !selectedSubsidyName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:bg-slate-400"
                  >
                    {loading ? <Spinner /> : <><FileText size={18}/> 計画骨子の作成へ</>}
                  </button>
                </div>
              </div>
            </div>

            {subsidyDetails && (
              <div ref={detailsRef} className="mt-8 p-6 bg-white rounded-xl border-2 border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="prose prose-blue max-w-none">
                  <MarkdownRenderer content={subsidyDetails} />
                </div>
              </div>
            )}
          </div>
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors no-print">
            <ArrowLeft size={16} /> 情報を修正する
          </button>
        </div>
      )}

      {step === AppStep.PLAN_DRAFTING && (
        <div className="space-y-6" ref={resultContainerRef}>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-green-600"/>
              AIアドバイザー作成 事業計画骨子 ({selectedSubsidyName})
            </h3>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 print:bg-white">
              <MarkdownRenderer content={draftResult} />
            </div>
          </div>
          <div className="flex justify-between items-center no-print">
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
              <ArrowLeft size={16} /> 補助金を選び直す
            </button>
            <button
              onClick={handleDraftApproval}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-lg shadow-lg flex items-center gap-2 transition-all transform active:scale-95 disabled:bg-slate-400"
            >
              {loading ? <Spinner /> : "最終要件チェックへ"}
            </button>
          </div>
        </div>
      )}

      {step === AppStep.CHECKLIST && (
        <div className="space-y-6" ref={resultContainerRef}>
          <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0">
            <div className="hidden print:block text-center mb-8 border-b-2 border-slate-900 pb-4">
               <h1 className="text-2xl font-bold">全国対応型 補助金申請支援レポート</h1>
               <p className="text-sm mt-2">発行元: 補助金AIパートナー / 所在地: {profile.location} / 業種: {profile.industry}</p>
            </div>
            
            <section className="mb-10">
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-blue-600 pl-3">1. AIアドバイザー診断レポート</h3>
              <div className="p-4 bg-slate-50 rounded-lg print:bg-white print:p-0">
                <MarkdownRenderer content={draftResult} />
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-indigo-600 pl-3">2. AIアドバイザーの重要チェックリスト</h3>
              <div className="p-4 bg-yellow-50 rounded-lg print:bg-white print:p-0">
                <MarkdownRenderer content={checklistResult} />
              </div>
            </section>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors order-2 md:order-1">
              <ArrowLeft size={16} /> 計画骨子を修正する
            </button>
            
            <div className="flex gap-4 order-1 md:order-2">
              <button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-12 rounded-full shadow-xl flex items-center gap-2 transition-all transform hover:scale-105"
              >
                <Download size={20} />
                PDFレポートを生成 (印刷)
              </button>
              <button
                onClick={resetApp}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-full shadow-lg flex items-center gap-2 transition-all opacity-80 hover:opacity-100"
              >
                <RefreshCw size={20} />
                最初から
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
