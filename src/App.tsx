import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  ShieldCheck, 
  Sparkles, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  ChevronRight,
  Info,
  History,
  Settings,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeDesign, getSafeDesignPrompt, generateSafeDesign, type DesignAnalysis } from './services/geminiService';

type Tab = 'capture' | 'analyze' | 'generate';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DesignAnalysis | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creativity, setCreativity] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setOriginalImage(event.target?.result as string);
              setAnalysis(null);
              setGeneratedImage(null);
              setError(null);
              setActiveTab('analyze');
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setAnalysis(null);
        setGeneratedImage(null);
        setError(null);
        setActiveTab('analyze');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError("Could not access camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setOriginalImage(dataUrl);
      setAnalysis(null);
      setGeneratedImage(null);
      setError(null);
      stopCamera();
      setActiveTab('analyze');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const runAnalysis = async () => {
    if (!originalImage) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeDesign(originalImage);
      setAnalysis(result);
    } catch (err) {
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runGeneration = async () => {
    if (!analysis) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateSafeDesign(analysis, creativity);
      setGeneratedImage(result);
    } catch (err) {
      console.error(err);
      setError("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  const copyToClipboard = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError("Failed to copy image to clipboard.");
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'LOW': return 'risk-low';
      case 'MEDIUM': return 'risk-medium';
      case 'HIGH': return 'risk-high';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="min-h-screen flex bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 flex flex-col glass-dark shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight leading-none">DesignSafe</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1">Enterprise AI</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {(['capture', 'analyze', 'generate'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                activeTab === tab 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {tab === 'capture' && <Camera className={`w-5 h-5 ${activeTab === tab ? 'text-emerald-400' : 'text-zinc-500'}`} />}
              {tab === 'analyze' && <ShieldCheck className={`w-5 h-5 ${activeTab === tab ? 'text-emerald-400' : 'text-zinc-500'}`} />}
              {tab === 'generate' && <Sparkles className={`w-5 h-5 ${activeTab === tab ? 'text-emerald-400' : 'text-zinc-500'}`} />}
              <span className="capitalize">{tab}</span>
              {activeTab === tab && (
                <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-500/80">USPTO Live Link Active</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 p-2 rounded-lg hover:bg-white/5 transition-colors flex justify-center">
              <History className="w-5 h-5 text-zinc-500" />
            </button>
            <button className="flex-1 p-2 rounded-lg hover:bg-white/5 transition-colors flex justify-center">
              <Settings className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 glass-dark z-10">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Workspace</span>
            <ChevronRight className="w-4 h-4 text-zinc-700" />
            <span className="text-sm font-medium text-zinc-300 capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                  U{i}
                </div>
              ))}
            </div>
            <button className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors">
              Share Project
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_50%)]">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'capture' && (
                <motion.div
                  key="capture"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <div className="lg:col-span-2 space-y-6">
                    <div className="aspect-video rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-6 bg-white/5 relative overflow-hidden group shadow-2xl">
                      {isCameraActive ? (
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : originalImage ? (
                        <img src={originalImage} className="absolute inset-0 w-full h-full object-contain p-8" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center space-y-4">
                          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto group-hover:bg-emerald-500/10 transition-colors">
                            <ImageIcon className="w-10 h-10 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                          </div>
                          <div>
                            <p className="text-zinc-300 font-bold text-lg">Drop your design here</p>
                            <p className="text-zinc-500 text-sm">Supports PNG, JPG, SVG or Clipboard Paste (Ctrl+V)</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={isCameraActive ? capturePhoto : startCamera}
                        className="flex items-center justify-center gap-3 p-6 rounded-2xl glass hover:bg-white/10 transition-all group border border-white/5"
                      >
                        <Camera className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">{isCameraActive ? 'Take Photo' : 'Use Camera'}</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-3 p-6 rounded-2xl glass hover:bg-white/10 transition-all group border border-white/5"
                      >
                        <Upload className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">Upload File</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const clipboardItems = await navigator.clipboard.read();
                            for (const item of clipboardItems) {
                              for (const type of item.types) {
                                if (type.startsWith('image/')) {
                                  const blob = await item.getType(type);
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    setOriginalImage(event.target?.result as string);
                                    setAnalysis(null);
                                    setGeneratedImage(null);
                                    setError(null);
                                    setActiveTab('analyze');
                                  };
                                  reader.readAsDataURL(blob);
                                  return;
                                }
                              }
                            }
                            setError("No image found in clipboard. Try copying an image first.");
                          } catch (err) {
                            setError("Clipboard access denied. You can still use Ctrl+V to paste.");
                          }
                        }}
                        className="flex items-center justify-center gap-3 p-6 rounded-2xl glass hover:bg-white/10 transition-all group border border-white/5"
                      >
                        <Sparkles className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">Paste Design</span>
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl glass border border-white/10 space-y-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Info className="w-5 h-5 text-emerald-400" />
                        Quick Guide
                      </h3>
                      <ul className="space-y-4">
                        {[
                          { title: "Capture", desc: "Upload or paste your design concept." },
                          { title: "USPTO Check", desc: "We'll cross-reference with live trademark databases." },
                          { title: "Recreate", desc: "Generate a unique version keeping your core elements." }
                        ].map((item, i) => (
                          <li key={i} className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-200">{item.title}</p>
                              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {originalImage && (
                      <button
                        onClick={() => setActiveTab('analyze')}
                        className="w-full py-6 bg-emerald-500 text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 group"
                      >
                        Analyze Design <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'analyze' && (
                <motion.div
                  key="analyze"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <div className="lg:col-span-2 space-y-8">
                    {!analysis && !isAnalyzing ? (
                      <div className="text-center space-y-6 py-24 glass rounded-3xl border border-white/10">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto rotate-12">
                          <ShieldCheck className="w-12 h-12 text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-3xl font-bold font-display tracking-tight">Ready for Legal Scan</h2>
                          <p className="text-zinc-400 text-sm max-w-md mx-auto">
                            We'll perform a deep scan of your design, checking for copyright risks and verifying trademark statuses on USPTO.gov.
                          </p>
                        </div>
                        <button
                          onClick={runAnalysis}
                          className="px-12 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                        >
                          Initialize Analysis
                        </button>
                      </div>
                    ) : isAnalyzing ? (
                      <div className="text-center py-32 space-y-6 glass rounded-3xl border border-white/10">
                        <div className="relative w-20 h-20 mx-auto">
                          <RefreshCw className="w-20 h-20 text-emerald-500 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-emerald-400" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-bold text-emerald-500 animate-pulse">Scanning USPTO Databases...</p>
                          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Checking Live/Dead Status</p>
                        </div>
                      </div>
                    ) : analysis && (
                      <div className="space-y-8">
                        <div className={`p-8 rounded-3xl border-2 ${getRiskColor(analysis.risk_level)} bg-white/5 flex items-start gap-6 shadow-2xl`}>
                          <div className={`p-4 rounded-2xl ${analysis.risk_level === 'LOW' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                            {analysis.risk_level === 'LOW' ? (
                              <CheckCircle2 className="w-10 h-10" />
                            ) : (
                              <AlertTriangle className="w-10 h-10" />
                            )}
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Risk Assessment: {analysis.risk_level}</h3>
                            <p className="text-zinc-300 leading-relaxed">{analysis.risk_explanation}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-8 rounded-3xl glass border border-white/10 space-y-6">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">USPTO Trademark Status</h4>
                            <div className="space-y-4">
                              {analysis.brand_indicators.length > 0 ? analysis.brand_indicators.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${item.status === 'LIVE' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className="text-sm font-bold text-zinc-200">{item.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                    item.status === 'LIVE' ? 'bg-rose-500/20 text-rose-400' : 
                                    item.status === 'DEAD' ? 'bg-emerald-500/20 text-emerald-400' : 
                                    'bg-zinc-500/20 text-zinc-400'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              )) : (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                  <span className="text-sm font-medium text-emerald-500">No Live Trademarks Detected</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-8 rounded-3xl glass border border-white/10 space-y-6">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Design Breakdown</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Style</p>
                                <p className="text-sm font-bold">{analysis.style}</p>
                              </div>
                              <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Layout</p>
                                <p className="text-sm font-bold truncate">{analysis.layout}</p>
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Color Palette</p>
                              <div className="flex gap-3">
                                {analysis.color_palette.map((color, i) => (
                                  <div 
                                    key={i} 
                                    className="w-8 h-8 rounded-xl border border-white/20 shadow-lg" 
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl glass border border-white/10 space-y-6">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Original Concept</h4>
                      <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                        {originalImage && <img src={originalImage} className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />}
                      </div>
                    </div>

                    {analysis && (
                      <button
                        onClick={() => setActiveTab('generate')}
                        className="w-full py-6 bg-emerald-500 text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 group"
                      >
                        Proceed to Generation <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'generate' && (
                <motion.div
                  key="generate"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <div className="lg:col-span-2 space-y-8">
                    <div className="p-8 rounded-3xl glass border border-white/10 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-emerald-400" />
                            Creative Re-imagining
                          </h3>
                          <p className="text-sm text-zinc-500">Keeping your core elements while creating a unique visual style.</p>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          Transparent Background Enabled
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-zinc-500 uppercase tracking-widest">Visual Transformation Intensity</span>
                          <span className="text-emerald-400">{Math.round(creativity * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1" 
                          value={creativity}
                          onChange={(e) => setCreativity(parseFloat(e.target.value))}
                          className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase">
                          <span>Faithful</span>
                          <span>Balanced</span>
                          <span>Abstract</span>
                        </div>
                      </div>
                    </div>

                    {generatedImage ? (
                      <div className="space-y-6">
                        <div className="aspect-square rounded-[40px] overflow-hidden border border-white/10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-zinc-900 relative group shadow-2xl">
                          <img 
                            src={generatedImage} 
                            className="w-full h-full object-contain p-12" 
                            alt="Generated Design"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-6 backdrop-blur-sm">
                            <button 
                              onClick={() => downloadImage(generatedImage, 'designsafe-final.png')}
                              className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
                              title="Download PNG"
                            >
                              <Download className="w-8 h-8" />
                            </button>
                            <button 
                              onClick={() => copyToClipboard(generatedImage)}
                              className="w-16 h-16 bg-emerald-500 text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
                              title="Copy to Clipboard"
                            >
                              {copySuccess ? <CheckCircle2 className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={runGeneration}
                            disabled={isGenerating}
                            className="flex-1 py-5 bg-white/5 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all border border-white/10"
                          >
                            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                            Try Another Variation
                          </button>
                          <button
                            onClick={() => downloadImage(generatedImage, 'designsafe-final.png')}
                            className="flex-1 py-5 bg-emerald-500 text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <Download className="w-5 h-5" />
                            Download Final PNG
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {isGenerating ? (
                          <div className="aspect-square rounded-[40px] border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-6 shadow-inner">
                            <div className="relative">
                              <RefreshCw className="w-24 h-24 text-emerald-500 animate-spin" />
                              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-400" />
                            </div>
                            <div className="text-center space-y-2">
                              <p className="text-2xl font-bold text-emerald-500 animate-pulse">Crafting Original Artwork...</p>
                              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Applying Transparent Layers</p>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={runGeneration}
                            className="w-full aspect-square border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center gap-6 hover:bg-white/5 transition-all group shadow-inner"
                          >
                            <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Sparkles className="w-12 h-12 text-emerald-500" />
                            </div>
                            <div className="text-center space-y-2">
                              <p className="text-2xl font-bold text-zinc-200">Start Generation</p>
                              <p className="text-sm text-zinc-500 max-w-xs">We'll use Gemini 2.5 Flash to create your unique, apparel-ready design.</p>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl glass border border-white/10 space-y-6">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Design Parameters</h4>
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Preserved Elements</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {analysis?.elements.map((el, i) => (
                              <span key={i} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">{el}</span>
                            ))}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Artistic Style</p>
                          <p className="text-sm font-bold text-zinc-200">{analysis?.style}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-bold text-emerald-400">Legal Safety Check</h4>
                      </div>
                      <p className="text-xs text-emerald-400/70 leading-relaxed">
                        The generated design uses unique artistic signatures while maintaining your core concept. This significantly reduces trademark risk on platforms like Amazon Merch or Redbubble.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="h-12 border-t border-white/5 flex items-center justify-between px-8 glass-dark text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          <div className="flex gap-6">
            <span>USPTO Database: v2.4.1</span>
            <span>Gemini 2.5 Flash: Active</span>
          </div>
          <p>DesignSafe AI © 2026 • Enterprise Design Protection</p>
        </footer>
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 p-5 bg-rose-500 text-white rounded-2xl shadow-2xl flex items-center gap-4 z-50 border border-rose-400/50"
          >
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold">System Alert</p>
              <p className="text-xs font-medium opacity-90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
