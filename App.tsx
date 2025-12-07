import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, Clock, CheckCircle, FileText, Settings, LogOut, Award, ChevronRight, 
  ClipboardList, Shield, Lock, Edit3, CheckSquare, Save, QrCode, Copy, 
  ExternalLink, Link as LinkIcon, Key, Mail, Phone, X, Upload, File as FileIcon, 
  AlertCircle, Trash2, List, LayoutList, Shuffle, Mic, MicOff, Volume2, 
  Globe, Zap, Brain, AlertTriangle, Eye, EyeOff, Anchor, FileDown, Printer, 
  ClipboardCopy, Calendar, FastForward, FileSpreadsheet, BookOpen, Archive, 
  DownloadCloud, UploadCloud, FileJson, Play, Maximize, Minimize, Unlock, Lock as LockIcon, RefreshCw, Cloud, Database
} from 'lucide-react';
import { Question, User as UserType, ExamResult, SavedExam, SystemConfig, TopicConfig } from './types';
import { generateExamQuestions } from './services/geminiService';
import { saveToCloud, loadFromCloud } from './services/cloudService';

const SHARED_BIN_ID = "6934ff7c43b1c97be9dce68e";
const SHARED_API_KEY = "$2a$10$VvYqj0KrK8QK/gdBu5hUwea7WWJz2zMc6GFDn2HZbfed9ohOa6QO.";
const EXPIRATION_DATE = new Date('2025-12-30T23:59:59'); 

const EXAM_PRESETS = [
  { name: "Lịch sử Đảng Cộng sản Việt Nam", subject: "Lịch sử Đảng Cộng sản Việt Nam", lesson: "Tổng hợp lịch sử hình thành và phát triển" },
  { name: "Lịch sử Quốc hội Việt Nam", subject: "Lịch sử Quốc hội Việt Nam", lesson: "Quá trình hình thành, tổ chức và hoạt động" },
  { name: "Lịch sử Quân đội Nhân dân VN", subject: "Lịch sử Quân đội Nhân dân Việt Nam", lesson: "Truyền thống đánh giặc giữ nước" },
  { name: "Lịch sử Hải quân Nhân dân VN", subject: "Lịch sử Hải quân Nhân dân Việt Nam", lesson: "Chiến công và truyền thống bảo vệ biển đảo" },
  { name: "Lịch sử Đoàn TNCS Hồ Chí Minh", subject: "Lịch sử Đoàn TNCS Hồ Chí Minh", lesson: "Phong trào thanh niên và cống hiến" },
  { name: "Luật An toàn giao thông đường bộ", subject: "Pháp luật về An toàn giao thông", lesson: "Luật Giao thông đường bộ và Văn hóa giao thông" },
  { name: "Phòng chống tác hại ma túy", subject: "Pháp luật và Kiến thức xã hội", lesson: "Phòng chống tác hại của ma túy và tệ nạn xã hội" },
];

const QUESTION_TYPE_LABELS: Record<string, string> = { single: "1 Đáp án", multiple: "Nhiều Đ.A", short: "Trả lời ngắn", fill: "Điền khuyết", essay: "Tự luận" };

const MOCK_QUESTIONS: Question[] = [
  { id: 1, type: 'single', difficulty: 'easy', question: "Ngày thành lập Hải quân Nhân dân Việt Nam là ngày nào?", options: ["A. 07/05/1955", "B. 22/12/1944", "C. 05/08/1964", "D. 02/09/1945"], correct_answer: "A", points: 1 },
  { id: 2, type: 'single', difficulty: 'easy', question: "Truyền thống vẻ vang của Quân chủng Hải quân là gì?", options: ["A. Quyết chiến, quyết thắng", "B. Chiến đấu anh dũng, mưu trí sáng tạo, làm chủ vùng biển, quyết chiến quyết thắng", "C. Trung với Đảng, hiếu với dân", "D. Đoàn kết, kỷ luật, thần tốc"], correct_answer: "B", points: 1 },
  { id: 3, type: 'multiple', difficulty: 'medium', question: "Các thành phần cơ bản của Hải quân nhân dân Việt Nam gồm những lực lượng nào?", options: ["A. Tàu mặt nước", "B. Tàu ngầm", "C. Không quân Hải quân", "D. Pháo binh - Tên lửa bờ"], correct_answer: "A,B,C,D", points: 2 },
  { id: 4, type: 'essay', difficulty: 'hard', question: "Đồng chí hãy liên hệ trách nhiệm bản thân trong việc bảo vệ chủ quyền biển đảo hiện nay?", options: [], correct_answer: "1. Nhận thức rõ vai trò, vị trí chiến lược của biển đảo.\n2. Tích cực học tập, rèn luyện nâng cao trình độ, sẵn sàng chiến đấu.\n3. Tham gia tuyên truyền về chủ quyền biển đảo.\n4. Đấu tranh với các hành vi xâm phạm chủ quyền.", points: 5 }
];

export default function ExamApp() {
  // --- STATE ---
  const [view, setView] = useState<'login' | 'register' | 'exam' | 'result' | 'admin'>('login'); 
  const [loginTab, setLoginTab] = useState<'candidate' | 'admin'>('candidate');
  const [notification, setNotification] = useState<{msg: string, type: 'info' | 'success' | 'error' | 'warning'} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [adminTab, setAdminTab] = useState<'questions' | 'results'>('questions');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [activeMicField, setActiveMicField] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCloudKey, setShowCloudKey] = useState(false);
  
  // Super Admin state derived from API Key presence (This is the Gemini API Key)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState(() => {
      if (typeof window !== 'undefined') return localStorage.getItem('exam_phone') || '';
      return '';
  });
  
  const [regForm, setRegForm] = useState<UserType>({ ho_ten: '', cap_bac: '', chuc_vu: '', don_vi: '' });

  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [adminLoginInput, setAdminLoginInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [genMode, setGenMode] = useState<'topic' | 'file'>('topic'); 
  const [examContent, setExamContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const repoInputRef = useRef<HTMLInputElement>(null);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  
  // Temporary input for API Key in Admin panel
  const [tempApiKey, setTempApiKey] = useState('');

  // KHO ĐỀ THI
  const [savedExams, setSavedExams] = useState<SavedExam[]>(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('exam_repository');
          return saved ? JSON.parse(saved) : [];
      }
      return [];
  });

  const [filePointConfig, setFilePointConfig] = useState({ single: 1, multiple: 1, short: 1, fill: 1, essay: 5 });
  const [topicConfig, setTopicConfig] = useState<TopicConfig>({
    subject: '', lesson: '', difficulty: 'mixed',
    diffCounts: { easy: 10, medium: 10, hard: 10 },
    typeCounts: { single: 10, multiple: 5, short: 5, fill: 5, essay: 5 },
    typePoints: { single: 1, multiple: 1, short: 1, fill: 1, essay: 5 }
  });

  const totalQuestionsCount = Object.values(topicConfig.typeCounts).reduce((a: number, b: number) => a + b, 0);
  const totalQuestionsPoints = Object.keys(topicConfig.typeCounts).reduce((acc, key) => acc + (topicConfig.typeCounts[key as keyof typeof topicConfig.typeCounts] * topicConfig.typePoints[key as keyof typeof topicConfig.typePoints]), 0);

  // Initialize sysConfig from LocalStorage to persist changes across reloads
  const [sysConfig, setSysConfig] = useState<SystemConfig>(() => {
    const defaults = {
        adminPassword: 'admin',
        adminEmail: 'admin@haocadang.edu.vn',
        adminPhone: '0987654321',
        examDuration: 45,
        maxAttempts: 0,
        apiKey: '',
        publicUrl: '',
        useGoogleSearch: true,
        thinkingMode: false,
        fastMode: false,
        cloudBinId: '',
        cloudApiKey: '',
        autoSync: false
    };
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('system_config');
        return saved ? JSON.parse(saved) : defaults;
    }
    return defaults;
  });

  // --- EFFECT ---
  // Save sysConfig to LocalStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('system_config', JSON.stringify(sysConfig));
    }
    // Update Super Admin status based on API Key presence (Gemini Key)
    setIsSuperAdmin(!!sysConfig.apiKey && sysConfig.apiKey.length > 5);
  }, [sysConfig]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSysConfig(prev => ({ ...prev, publicUrl: window.location.href }));
      const now = new Date();
      if (now > EXPIRATION_DATE) { setIsExpired(true); } 
      else { setDaysLeft(Math.ceil(Math.abs(EXPIRATION_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))); }
      
      // Attempt to load cloud config if separated
      // This logic ensures that if the main config lost the key, but we saved it separately, we restore it.
      const savedCloud = localStorage.getItem('cloud_config');
      if (savedCloud) {
          try {
             const parsed = JSON.parse(savedCloud);
             let binId = parsed.binId || '';
             // Sanitize loaded ID immediately to fix legacy dirty data
             // Allow only alphanumeric, hyphens, and underscores
             binId = binId.replace(/[^a-zA-Z0-9-_]/g, '');
             
             setSysConfig(prev => ({ 
                 ...prev, 
                 // Prioritize loading from dedicated storage if state is empty
                 cloudBinId: prev.cloudBinId || binId,
                 cloudApiKey: prev.cloudApiKey || parsed.apiKey || '' 
             }));
          } catch(e) {}
      }
    }
  }, []);

  // AUTO-PULL ON LOGIN
  useEffect(() => {
    const autoPullData = async () => {
        if (view === 'login' && sysConfig.cloudBinId && sysConfig.cloudApiKey) {
            try {
                await handlePullFromCloud(true);
            } catch (e) {
                console.log("Auto-pull silent fail", e);
            }
        }
    };
    autoPullData();
  }, [view]); 

  // AUTO-PUSH (SMART SYNC)
  useEffect(() => {
    // Check if auto-sync is enabled and keys are present
    if (!sysConfig.autoSync || !sysConfig.cloudBinId || !sysConfig.cloudApiKey) return;
    
    // Safety check to prevent syncing garbage IDs
    if (sysConfig.cloudBinId.length < 5 || sysConfig.cloudBinId.includes("undefined")) return;

    // Debounce: Wait 5 seconds after last change before pushing
    const handler = setTimeout(() => {
        handlePushToCloud(true); 
    }, 5000); 

    return () => clearTimeout(handler);
  }, [questions, sysConfig, topicConfig, savedExams, examResults]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (view === 'exam') {
      const prevent = (e: Event) => { 
        e.preventDefault(); 
        showNotify('Hệ thống bảo mật: Cấm thao tác này!', 'error'); 
      };
      document.addEventListener('contextmenu', prevent); 
      document.addEventListener('copy', prevent);
      document.addEventListener('cut', prevent); 
      document.addEventListener('paste', prevent);
      return () => {
        document.removeEventListener('contextmenu', prevent); 
        document.removeEventListener('copy', prevent);
        document.removeEventListener('cut', prevent); 
        document.removeEventListener('paste', prevent);
      };
    }
  }, [view]);

  useEffect(() => {
    let t: any;
    if (view === 'exam' && timeLeft > 0) {
      t = setInterval(() => setTimeLeft(p => { 
          if (p <= 1) { 
            clearInterval(t);
            setShowSubmitModal(false);
            setView('result');
            return 0; 
          } 
          return p - 1; 
      }), 1000);
    } else if (view === 'exam' && timeLeft === 0) {
       finishExam();
    }
    return () => clearInterval(t);
  }, [view, timeLeft]);

  // --- HELPERS ---
  const showNotify = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const message = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
    setNotification({ msg: message, type });
    setTimeout(() => setNotification(null), type === 'error' ? 5000 : 3000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getQuestionHint = (type: string) => {
    switch(type) {
        case 'single': return '(Chọn 1 đáp án đúng)';
        case 'multiple': return '(Chọn nhiều đáp án)';
        case 'short': return '(Trả lời ngắn gọn)';
        case 'fill': return '(Điền từ vào chỗ trống)';
        case 'essay': return '(Viết câu trả lời tự luận)';
        default: return '';
    }
  };

  const formatDateVietnamese = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // --- HANDLERS ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => {
            console.log(e);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  const handleSaveContactInfo = () => showNotify("Đã lưu thông tin liên hệ thành công!", "success");
  
  const handleActivateApiKey = () => { 
      if (!tempApiKey) return showNotify('Vui lòng nhập API Key để kích hoạt quyền Cao cấp', 'error'); 
      setSysConfig({...sysConfig, apiKey: tempApiKey});
      setTempApiKey('');
      showNotify('Đã kích hoạt quyền Admin Cao cấp!', 'success'); 
  };

  const handleShuffle = () => { if (!questions.length) return; setQuestions([...questions].sort(() => Math.random() - 0.5)); showNotify("Đã trộn đề thi!", "success"); };

  const handleApplyPreset = (preset: { subject: string, lesson: string, name: string }) => {
      setTopicConfig(prev => ({
          ...prev,
          subject: preset.subject,
          lesson: preset.lesson,
      }));
      showNotify(`Đã chọn chủ đề: ${preset.name}. Vui lòng cấu hình số lượng bên dưới.`, "success");
  };

  // --- CLOUD SYNC HANDLERS ---
  const handleSaveCloudConfig = () => {
      if (!sysConfig.cloudApiKey) {
          return showNotify("Vui lòng nhập Master Key trước khi lưu.", "error");
      }
      
      const configToSave = { 
          binId: sysConfig.cloudBinId, 
          apiKey: sysConfig.cloudApiKey 
      };
      
      // Explicitly save to dedicated 'cloud_config' key in localStorage
      localStorage.setItem('cloud_config', JSON.stringify(configToSave));
      
      // Also ensure system_config is up to date immediately
      localStorage.setItem('system_config', JSON.stringify(sysConfig));
      
      showNotify("Đã lưu Master Key vào bộ nhớ trình duyệt! Bạn sẽ không cần nhập lại ở lần sau.", "success");
  };

  const handlePushToCloud = async (silent = false) => {
      if (!sysConfig.cloudApiKey) {
          if (!silent) showNotify("Vui lòng nhập JSONBin Master Key!", "error");
          return;
      }
      
      // AUTO MODE: No questions asked about Bin ID, managed internally.
      // Confirm overwrite if updating existing bin, unless silent.
      if (sysConfig.cloudBinId && !silent) {
         if (!confirm("Xác nhận: Đồng bộ và Ghi đè dữ liệu hiện tại lên Đám mây?")) return;
      }
      
      setIsSyncing(true);
      try {
          const payload = {
              questions,
              sysConfig, 
              topicConfig,
              savedExams,
              examResults,
              lastUpdated: new Date().toISOString()
          };
          const result = await saveToCloud(sysConfig, payload);
          
          if (result.newBinId) {
             const newConfig = { ...sysConfig, cloudBinId: result.newBinId };
             setSysConfig(newConfig); 
             
             // PERSISTENCE: Save new config to both storages on success
             localStorage.setItem('system_config', JSON.stringify(newConfig));
             localStorage.setItem('cloud_config', JSON.stringify({ binId: result.newBinId, apiKey: sysConfig.cloudApiKey }));
             
             if (!silent) showNotify(`Đồng bộ thành công! (Đã tạo kho dữ liệu mới)`, "success");
          } else {
             // PERSISTENCE: Save existing config to be sure
             localStorage.setItem('cloud_config', JSON.stringify({ binId: sysConfig.cloudBinId, apiKey: sysConfig.cloudApiKey }));
             if (!silent) showNotify("Cập nhật dữ liệu lên Đám mây thành công!", "success");
          }
          setLastSyncTime(new Date());
      } catch (error: any) {
          console.error("Cloud Push Error:", error);
          if(!silent) showNotify("Lỗi đồng bộ: " + error.message, "error");
      } finally {
          setIsSyncing(false);
      }
  };

  const handlePullFromCloud = async (silent = false) => {
      if (!sysConfig.cloudBinId || !sysConfig.cloudApiKey) {
          // Silent fail if no config (normal for first load)
          if (!silent) showNotify("Chưa có cấu hình đồng bộ!", "error");
          return;
      }

      // If manual pull (silent=false), confirm first
      if(!silent && !confirm("Dữ liệu hiện tại sẽ bị thay thế bởi dữ liệu từ Cloud. Đồng chí tiếp tục?")) return;
      
      setIsSyncing(true);
      try {
          const data = await loadFromCloud(sysConfig);
          if (data) {
              if (data.questions) setQuestions(data.questions);
              if (data.sysConfig) {
                  setSysConfig(prev => ({
                      ...data.sysConfig,
                      // Keep local sensitive keys if pulling old data
                      cloudBinId: prev.cloudBinId || data.sysConfig.cloudBinId, 
                      cloudApiKey: prev.cloudApiKey || data.sysConfig.cloudApiKey,
                      apiKey: prev.apiKey || data.sysConfig.apiKey 
                  }));
                  localStorage.setItem('system_config', JSON.stringify(data.sysConfig));
              }
              if (data.topicConfig) setTopicConfig(data.topicConfig);
              if (data.savedExams) {
                  setSavedExams(data.savedExams);
                  localStorage.setItem('exam_repository', JSON.stringify(data.savedExams));
              }
              if (data.examResults) setExamResults(data.examResults);
              
              // PERSISTENCE: Ensure cloud config is saved after a successful pull
              localStorage.setItem('cloud_config', JSON.stringify({ binId: sysConfig.cloudBinId, apiKey: sysConfig.cloudApiKey }));

              setLastSyncTime(new Date(data.lastUpdated || new Date()));
              if(!silent) showNotify(`Đồng bộ về máy thành công!`, "success");
          }
      } catch (error: any) {
          console.error("Cloud Pull Error:", error);
          if(!silent) showNotify("Lỗi tải về: " + error.message, "error");
      } finally {
          setIsSyncing(false);
      }
  };

  // --- EXAM REPOSITORY HANDLERS ---
  const handleSaveCurrentExam = () => {
      if (questions.length === 0) return showNotify("Chưa có câu hỏi nào để lưu!", "error");
      const examName = prompt("Nhập tên đề thi để lưu vào kho:", `Đề thi ${new Date().toLocaleDateString('vi-VN')}`);
      if (!examName) return;

      const newExam: SavedExam = {
          id: Date.now(),
          name: examName,
          questions: questions,
          createdAt: new Date().toISOString()
      };

      setSavedExams(prev => {
          const updated = [newExam, ...prev];
          localStorage.setItem('exam_repository', JSON.stringify(updated));
          return updated;
      });
      showNotify("Đã lưu đề thi vào kho thành công!", "success");
  };

  const handleUseSavedExam = (exam: SavedExam) => {
      if (window.confirm(`Đồng chí muốn sử dụng bộ đề "${exam.name}" cho kỳ thi này?`)) {
          setQuestions(exam.questions);
          showNotify(`Đã kích hoạt bộ đề: ${exam.name}`, "success");
      }
  };

  const handleDeleteSavedExam = (id: number) => {
      if (window.confirm("Đồng chí chắc chắn muốn xóa đề thi này khỏi kho?")) {
          setSavedExams(prev => {
              const updated = prev.filter(e => e.id !== id);
              localStorage.setItem('exam_repository', JSON.stringify(updated));
              return updated;
          });
          showNotify("Đã xóa đề thi khỏi kho.", "success");
      }
  };

  const handleExportSavedExamFile = (exam: SavedExam) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exam));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${exam.name.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      showNotify("Đã xuất file nguồn đề thi thành công!", "success");
  };

  const handleImportSavedExamFile = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const result = e.target?.result;
              if (typeof result !== 'string') return;
              const importedExam = JSON.parse(result);
              if (!importedExam.questions || !Array.isArray(importedExam.questions)) throw new Error("File không hợp lệ");
              
              importedExam.id = Date.now();
              importedExam.createdAt = new Date().toISOString();
              
              setSavedExams(prev => {
                  const updated = [importedExam, ...prev];
                  localStorage.setItem('exam_repository', JSON.stringify(updated));
                  return updated;
              });
              showNotify(`Đã nhập kho đề thi: ${importedExam.name}`, "success");
          } catch (err: any) {
              showNotify("Lỗi đọc file: " + err.message, "error");
          }
      };
      reader.readAsText(file);
      event.target.value = '';
  };

  const handleReadQuestion = (text: string, id: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isSpeaking === id) { setIsSpeaking(null); return; }
      const u = new window.SpeechSynthesisUtterance(text); 
      u.lang = 'vi-VN'; 
      u.onend = () => setIsSpeaking(null);
      setIsSpeaking(id); 
      window.speechSynthesis.speak(u);
    } else showNotify("Trình duyệt không hỗ trợ đọc.", "error");
  };

  const handleVoiceInput = (field: string, current: string, setVal: (v: string) => void) => {
    if (!('webkitSpeechRecognition' in window)) return showNotify("Dùng Chrome để nhập giọng nói.", "error");
    if (isListening && activeMicField === field) { setIsListening(false); setActiveMicField(null); return; }
    const rec = new window.webkitSpeechRecognition(); 
    rec.lang = 'vi-VN';
    rec.onstart = () => { setIsListening(true); setActiveMicField(field); showNotify("Đang nghe...", "info"); };
    rec.onresult = (e: any) => { 
        const transcript = e.results[0][0].transcript;
        setVal(current ? `${current} ${transcript}` : transcript); 
        showNotify("Đã nhập.", "success"); 
    };
    rec.onend = () => { setIsListening(false); setActiveMicField(null); };
    rec.start();
  };

  const handleGenerateExam = async () => {
    setIsLoading(true);
    setUserAnswers({}); // Reset answers when regenerating questions
    try {
      const newQuestions = await generateExamQuestions(
        sysConfig,
        topicConfig,
        genMode,
        examContent,
        fileBase64,
        selectedFile ? selectedFile.type : null,
        filePointConfig
      );

      setQuestions(newQuestions);
      
      const autoExamName = genMode === 'file' && selectedFile
        ? `Đề từ file: ${selectedFile.name}` 
        : `Đề: ${topicConfig.subject} (${new Date().toLocaleTimeString('vi-VN')})`;

      const autoSavedExam: SavedExam = {
          id: Date.now(),
          name: autoExamName,
          questions: newQuestions,
          createdAt: new Date().toISOString()
      };
      
      setSavedExams(prev => {
          const updated = [autoSavedExam, ...prev];
          localStorage.setItem('exam_repository', JSON.stringify(updated));
          return updated;
      });

      showNotify(`Đã tạo và tự động lưu đề thi: "${autoExamName}" vào kho!`, 'success'); 
      setAdminTab('questions'); 
    } catch (e: any) {
      showNotify(`Lỗi AI: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- EXPORT FUNCTIONS ---
  const getExamHTML = () => `
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>De_Thi_Hai_Quan</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.5; font-size: 12pt; }
          .header { text-align: center; margin-bottom: 30px; }
          .school { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
          .dept { font-size: 13pt; font-weight: bold; margin-bottom: 15px; }
          .title { font-size: 16pt; font-weight: bold; margin-top: 25px; text-transform: uppercase; }
          .meta { font-style: italic; margin-bottom: 20px; }
          .question { margin-bottom: 15px; page-break-inside: avoid; text-align: left; }
          .q-text { font-weight: bold; }
          .options { margin-left: 20px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 50px; font-style: italic; border-top: 1px solid #ccc; padding-top: 10px;}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school">TRƯỜNG CAO ĐẲNG KỸ THUẬT HẢI QUÂN</div>
          <div class="dept">PHÒNG CHÍNH TRỊ</div>
          <hr style="width: 150px; margin: 10px auto; border: 1px solid #000;">
          <div class="title">ĐỀ THI KHẢO SÁT CHẤT LƯỢNG</div>
          <div class="meta">
            Môn thi: ${topicConfig.subject || 'Kiến thức chung'}<br/>
            Thời gian làm bài: ${sysConfig.examDuration} phút
          </div>
        </div>
        <div class="content">
          ${questions.map((q, i) => `
            <div class="question">
              <div class="q-text">Câu ${i + 1}: ${q.question} <i>(${q.points} điểm)</i></div>
              ${(q.type === 'single' || q.type === 'multiple') ? `
                <div class="options">
                  ${q.options?.map(o => `<div>${o}</div>`).join('')}
                </div>
              ` : ''}
              ${q.type === 'essay' ? '<div style="height: 150px; border: 1px dotted #ccc; margin-top: 10px;"></div>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="footer">
          - HẾT -<br/>
          Cán bộ coi thi không giải thích gì thêm.
        </div>
      </body>
    </html>`;
  
  const handleExportWord = () => {
    if (!questions.length) return showNotify("Chưa có câu hỏi", "error");
    const html = getExamHTML();
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'De_Thi_Hai_Quan.doc'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showNotify("Đã xuất file Word.", "success");
  };

  const handleExportPDF = () => {
    if (!questions.length) return showNotify("Chưa có câu hỏi", "error");
    
    if (window.html2pdf) {
        setIsLoading(true);
        const element = document.createElement('div');
        element.innerHTML = getExamHTML();
        
        const opt = {
          margin:       15,
          filename:     'De_Thi_Hai_Quan.pdf',
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(element).save().then(() => {
            setIsLoading(false);
            showNotify("Đã lưu file PDF thành công!", "success");
        }).catch((err: any) => {
            setIsLoading(false);
            showNotify("Lỗi lưu PDF: " + err, "error");
        });
    } else {
        showNotify("Đang tải thư viện xuất PDF, vui lòng thử lại...", "warning");
    }
  };

  const handleCopyExamText = () => {
    if (!questions.length) return showNotify("Chưa có câu hỏi", "error");
    const text = questions.map((q, i) => `${i + 1}. ${q.question}\n${q.options?.join('\n') || ''}`).join('\n\n');
    navigator.clipboard.writeText(text);
    showNotify("Đã copy nội dung đề!", "success");
  };

  const handleExportExcel = () => {
    if (examResults.length === 0) return showNotify("Chưa có kết quả!", "error");
    let csv = "STT,Họ Tên,Cấp Bậc,Chức Vụ,Đơn Vị,Kết Quả,Thời Gian Nộp\n";
    examResults.forEach((r, i) => {
        const timeStr = formatDateVietnamese(r.timestamp);
        csv += `${i+1},"${r.user.ho_ten}","${r.user.cap_bac}","${r.user.chuc_vu}","${r.user.don_vi}","${r.score}","${timeStr}"\n`;
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Ket_Qua_Thi_${new Date().getTime()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showNotify("Đã xuất Excel thành công!", "success");
  };

  // --- LOGOUT HANDLERS ---
  const handleLogoutCandidateClick = () => {
      setShowLogoutModal(true);
  };
  
  const confirmLogoutCandidate = () => {
      setShowLogoutModal(false);
      setCurrentUser(null);
      setView('login');
  };

  // --- MAIN LOGIC HANDLERS ---
  const handleLogin = () => {
    if (isExpired) return showNotify("Hệ thống đã hết hạn.", "error");
    if (loginTab === 'admin') {
      if (adminLoginInput === sysConfig.adminPassword) { 
        setView('admin'); 
        showNotify("Đăng nhập thành công", "success"); 
      } 
      else showNotify("Sai mật khẩu", "error");
    } else {
      if (/^[0-9]{10}$/.test(phoneNumber)) {
          const candidateDB = JSON.parse(localStorage.getItem('candidate_db') || '{}');
          const savedInfo = candidateDB[phoneNumber];
          
          if (savedInfo) {
              setRegForm(savedInfo);
              showNotify(`Chào mừng trở lại, đồng chí ${savedInfo.ho_ten}`, 'success');
          }
          
          setView('register'); 
      } else showNotify("SĐT không hợp lệ", "error");
    }
  };

  const finishExam = () => {
    let e = 0, t = 0;
    questions.forEach(q => {
      t += q.points;
      const a = userAnswers[q.id];
      if (!a) return;
      if (q.type === 'single' && a.startsWith(q.correct_answer)) e += q.points;
      else if (q.type === 'multiple' && a.split(',').sort().join(',') === q.correct_answer.split(',').sort().join(',')) e += q.points;
      else if ((q.type === 'short' || q.type === 'fill') && a.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) e += q.points;
    });
    setScore(e); setMaxScore(t);
    if (currentUser) {
        setExamResults(p => [{ id: Date.now(), timestamp: new Date().toISOString(), user: currentUser, score: e, totalScore: t, detailAnswers: userAnswers }, ...p]);
    }
    showNotify("Nộp bài thành công! Đang chuyển đến trang kết quả...", "success");
    setView('result');
    setShowSubmitModal(false);
  };

  const handleSubmitButtonClick = () => {
      setShowSubmitModal(true);
  };

  const handleRegisterAndStart = () => {
    if (!regForm.ho_ten || !regForm.cap_bac || !regForm.chuc_vu || !regForm.don_vi) return showNotify('Yêu cầu khai báo đầy đủ thông tin.', 'error');
    
    const candidateDB = JSON.parse(localStorage.getItem('candidate_db') || '{}');
    candidateDB[phoneNumber] = regForm;
    localStorage.setItem('candidate_db', JSON.stringify(candidateDB));

    if (sysConfig.maxAttempts > 0) {
      const attempts = examResults.filter(r => r.user.sdt === phoneNumber).length;
      if (attempts >= sysConfig.maxAttempts) return showNotify(`Đồng chí đã hết lượt tham gia kiểm tra.`, 'error');
    }
    setCurrentUser({ sdt: phoneNumber, ...regForm });
    setView('exam');
    setTimeLeft(sysConfig.examDuration * 60);
    setUserAnswers({});
    
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
            console.log("Full screen prevented");
        });
    }
  };

  const handleForgotPassword = () => {
    if (!forgotInput) return showNotify('Vui lòng nhập Email/SĐT', 'error');
    if (forgotInput === sysConfig.adminEmail || forgotInput === sysConfig.adminPhone) {
        setIsLoading(true);
        setTimeout(() => { 
            setIsLoading(false); 
            setShowForgotModal(false); 
            setForgotInput(''); 
            setSysConfig(p => ({ ...p, adminPassword: 'admin' })); 
            showNotify(`Mật khẩu đã reset về 'admin'.`, 'success'); 
        }, 1500);
    } else showNotify("Thông tin không chính xác!", "error");
  };

  // --- RENDERERS ---
  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-200 p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
      <button 
        onClick={toggleFullScreen}
        className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg text-slate-600 hover:text-blue-900 transition-colors z-50"
        title="Toàn màn hình"
      >
        {document.fullscreenElement ? <Minimize size={24}/> : <Maximize size={24}/>}
      </button>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-blue-900">
        <div className="bg-blue-900 p-6 text-center text-white">
          <img src={LOGO_URL} alt="Logo" className="w-24 h-24 mx-auto mb-3 object-contain drop-shadow-lg bg-white rounded-full border-2 border-yellow-400"/>
          <h1 className="text-lg font-bold uppercase">Hệ thống thi trực tuyến</h1>
          <p className="text-xs text-blue-200 uppercase mt-1 font-semibold">Trường Cao đẳng Kỹ thuật Hải quân</p>
        </div>
        <div className="bg-yellow-50 px-4 py-2 text-center border-b border-yellow-200">
           {isExpired ? <p className="text-xs font-bold text-red-600 flex justify-center gap-1"><AlertTriangle size={12}/> HẾT HẠN (30/12/2025)</p> : <p className="text-[10px] font-bold text-yellow-800 flex justify-center gap-1"><Calendar size={12}/> Dùng thử: Còn {daysLeft} ngày</p>}
        </div>
        <div className="p-6 space-y-4">
           <div className="flex border-b border-slate-200">
             <button className={`flex-1 py-2 text-sm font-bold uppercase ${loginTab==='candidate'?'text-blue-900 border-b-2 border-blue-900':'text-slate-400'}`} onClick={()=>setLoginTab('candidate')}>Thí sinh</button>
             <button className={`flex-1 py-2 text-sm font-bold uppercase ${loginTab==='admin'?'text-red-800 border-b-2 border-red-800':'text-slate-400'}`} onClick={()=>setLoginTab('admin')}>Quản trị</button>
           </div>
           {loginTab === 'candidate' ? (
             <div className="relative"><Phone size={18} className="absolute top-3 left-3 text-slate-400"/><input disabled={isExpired} className="w-full pl-10 p-3 border rounded font-bold text-slate-800 focus:border-blue-900 outline-none" placeholder="Nhập SĐT..." value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)}/></div>
           ) : (
             <div className="relative">
                <Key size={18} className="absolute top-3 left-3 text-slate-400"/>
                <input disabled={isExpired} type={showAdminPassword?"text":"password"} autoComplete="off" className="w-full pl-10 pr-10 p-3 border rounded font-bold text-slate-800 focus:border-red-800 outline-none" placeholder="Mật khẩu..." value={adminLoginInput} onChange={e=>setAdminLoginInput(e.target.value)}/>
                <button onClick={()=>setShowAdminPassword(!showAdminPassword)} className="absolute top-3 right-3 text-slate-400">{showAdminPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                <div className="text-right mt-1"><button onClick={()=>setShowForgotModal(true)} className="text-xs text-blue-600 hover:underline">Quên mật khẩu?</button></div>
             </div>
           )}
           <button onClick={handleLogin} disabled={isExpired} className={`w-full py-3 rounded text-white font-bold shadow-lg uppercase transition-transform active:scale-95 ${loginTab==='candidate'?'bg-blue-900':'bg-red-800'}`}>Đăng nhập</button>
           
           {/* Cloud Sync Status for Candidate */}
           {sysConfig.cloudBinId && (
               <div className="text-center mt-2">
                   <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                       <Cloud size={10}/> Dữ liệu đồng bộ: {lastSyncTime ? formatDateVietnamese(lastSyncTime.toISOString()) : 'Đang cập nhật...'}
                   </p>
               </div>
           )}
        </div>
        <div className="bg-slate-50 p-3 text-center border-t"><p className="text-[10px] text-slate-500 font-bold uppercase">Bản quyền: Trung tá QNCN Mai Xuân Hảo<br/>Nhân viên, Phòng Chính trị</p></div>
      </div>
      
      {showForgotModal && (
         <div className="absolute inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded shadow-lg w-full max-w-sm p-6">
               <h3 className="font-bold mb-4 text-slate-800 flex gap-2"><Shield size={20} className="text-blue-600"/> Khôi phục</h3>
               <input className="w-full p-2 border rounded mb-3 text-sm" placeholder="Email/SĐT Admin..." value={forgotInput} onChange={e=>setForgotInput(e.target.value)}/>
               <div className="flex gap-2">
                  <button onClick={handleForgotPassword} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold uppercase">Gửi</button>
                  <button onClick={()=>setShowForgotModal(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded text-xs font-bold uppercase">Hủy</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );

  const renderRegister = () => (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
       <div className="bg-white p-8 rounded shadow-xl w-full max-w-lg border-t-4 border-blue-800">
          <h2 className="text-xl font-black text-blue-900 uppercase text-center mb-4">Thông tin quân nhân</h2>
          <div className="space-y-3">
             <input className="w-full p-3 border rounded focus:border-blue-900 uppercase font-bold outline-none" placeholder="Họ tên (VD: NGUYỄN VĂN A)" value={regForm.ho_ten} onChange={e=>setRegForm({...regForm, ho_ten:e.target.value.toUpperCase()})}/>
             <div className="grid grid-cols-2 gap-3"><input className="p-3 border rounded outline-none" placeholder="Cấp bậc" value={regForm.cap_bac} onChange={e=>setRegForm({...regForm, cap_bac:e.target.value})}/><input className="p-3 border rounded outline-none" placeholder="Chức vụ" value={regForm.chuc_vu} onChange={e=>setRegForm({...regForm, chuc_vu:e.target.value})}/></div>
             <input className="w-full p-3 border rounded outline-none" placeholder="Đơn vị" value={regForm.don_vi} onChange={e=>setRegForm({...regForm, don_vi:e.target.value})}/>
          </div>
          <div className="flex gap-3 mt-6">
             <button onClick={()=>setView('login')} className="flex-1 bg-slate-200 py-3 rounded font-bold text-slate-600">QUAY LẠI</button>
             <button onClick={handleRegisterAndStart} className="flex-[2] bg-blue-900 text-white py-3 rounded font-bold shadow-lg hover:bg-blue-800">BẮT ĐẦU</button>
          </div>
       </div>
    </div>
  );

  const renderExam = () => (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row relative select-none">
       {/* Mobile Header */}
       <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white z-40 flex justify-between items-center p-3 shadow-lg">
           <div className="flex items-center gap-2">
              <div className="bg-black border border-red-600 rounded px-3 py-1 text-red-500 font-mono font-bold text-lg">{formatTime(timeLeft)}</div>
           </div>
           <div className="flex gap-2">
               <button onClick={()=>setShowMobileInfo(!showMobileInfo)} className="p-2 bg-slate-800 rounded text-yellow-400"><User size={20}/></button>
               <button onClick={handleSubmitButtonClick} className="px-3 py-1 bg-blue-600 rounded font-bold text-sm uppercase">Nộp</button>
           </div>
       </div>
       
       {/* Mobile Info Drawer */}
       {showMobileInfo && (
           <div className="fixed top-16 left-0 w-full bg-white z-30 p-4 shadow-xl border-b-4 border-blue-900 animate-in slide-in-from-top">
               <h3 className="font-bold text-blue-900 border-b pb-2 mb-2">THÔNG TIN THÍ SINH</h3>
               <p>Họ tên: <b>{currentUser?.ho_ten}</b></p>
               <p>Đơn vị: {currentUser?.don_vi}</p>
               <div className="flex gap-2 mt-3">
                    <button onClick={()=>setShowMobileInfo(false)} className="flex-1 bg-slate-200 py-2 rounded text-slate-700 font-bold">Đóng</button>
                    <button onClick={handleLogoutCandidateClick} className="flex-1 bg-red-100 text-red-700 py-2 rounded font-bold border border-red-200">Đăng xuất</button>
               </div>
           </div>
       )}

       <div className="hidden md:flex w-full md:w-80 bg-slate-900 text-white p-6 pt-10 border-r border-slate-700 flex-col fixed h-full z-10">
          <div className="bg-slate-800 p-4 rounded mb-6 text-sm border border-slate-600">
             <div className="font-bold text-yellow-400 border-b border-slate-600 pb-2 mb-2 flex gap-2 items-center"><User size={14}/> THÔNG TIN</div>
             <p className="font-bold text-lg uppercase">{currentUser?.ho_ten}</p>
             <p className="text-slate-300">{currentUser?.cap_bac} - {currentUser?.don_vi}</p>
             <button onClick={handleLogoutCandidateClick} className="mt-3 w-full py-1.5 bg-red-900/50 hover:bg-red-900 text-red-200 text-xs font-bold rounded border border-red-800 flex items-center justify-center gap-1 transition-colors"><LogOut size={12}/> Đăng xuất</button>
          </div>
          <div className="mt-auto mb-6 pt-4 border-t border-slate-700">
             <div className="flex items-center gap-2 text-red-400 font-bold uppercase text-xs mb-2"><Clock size={14}/> Thời gian</div>
             <div className="text-5xl font-mono font-bold text-center bg-black text-red-500 py-4 rounded border-2 border-red-900 shadow-[0_0_10px_rgba(220,38,38,0.5)]">{formatTime(timeLeft)}</div>
          </div>
          {/* HIỂN THỊ SỐ LƯỢT THI CÒN LẠI */}
          <div className="mb-6 pt-4 border-t border-slate-700">
             <div className="flex items-center gap-2 text-blue-400 font-bold uppercase text-xs mb-2"><Zap size={14}/> Số lượt còn lại</div>
             <div className="text-3xl font-mono font-bold text-center bg-black text-blue-500 py-2 rounded border-2 border-blue-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                 {sysConfig.maxAttempts === 0 ? '∞' : (sysConfig.maxAttempts - examResults.filter(r => r.user.sdt === currentUser?.sdt).length)}
             </div>
          </div>
          <button onClick={handleSubmitButtonClick} className="w-full bg-blue-900 text-white font-bold py-3 rounded border border-blue-500 shadow-lg hover:bg-blue-800 uppercase">NỘP BÀI</button>
       </div>
       <div className="flex-1 p-4 md:p-8 pt-20 md:pt-16 overflow-y-auto relative md:ml-80">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] fixed"><img src={LOGO_URL} className="w-[500px] grayscale"/></div>
          <div className="max-w-4xl mx-auto relative z-10">
             <div className="flex justify-between items-end mb-6 border-b-2 border-slate-300 pb-4">
                <div><h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase flex items-center gap-3"><img src={LOGO_URL} className="w-10 h-10 rounded-full border-2 border-yellow-500"/> ĐỀ THI CHÍNH THỨC</h1></div>
             </div>
             {questions.map((q,idx)=>(
                <div key={q.id} className="bg-white p-4 md:p-6 rounded shadow-sm border border-slate-200 mb-6 relative">
                   <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-slate-900 flex gap-3 w-full text-base md:text-lg leading-relaxed"><span className="bg-blue-900 text-white px-2 py-1 rounded text-xs h-fit whitespace-nowrap mt-0.5">Câu {idx+1}</span><span className="flex-1">{q.question} <span className="text-blue-600 italic text-sm font-normal ml-1">{getQuestionHint(q.type)}</span></span><button onClick={()=>handleReadQuestion(q.question, q.id)} className="p-1 rounded hover:bg-slate-100"><Volume2 size={16}/></button></h3>
                      <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded ml-2 whitespace-nowrap border">{q.points}đ</span>
                   </div>
                   <div className="absolute top-2 right-2"><span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${q.difficulty==='easy'?'bg-green-100 text-green-700':q.difficulty==='hard'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{q.difficulty||'TB'}</span></div>
                   {q.type==='single' && <div className="space-y-2 pl-0 md:pl-2">{q.options?.map((o,i)=>(<label key={i} className={`flex p-3 rounded border cursor-pointer hover:bg-blue-50 ${userAnswers[q.id]===o?'border-blue-800 bg-blue-50':''}`}><div className={`min-w-[20px] h-[20px] rounded-full border-2 mr-3 flex items-center justify-center ${userAnswers[q.id]===o?'border-blue-800':'border-slate-400'}`}>{userAnswers[q.id]===o && <div className="w-3 h-3 bg-blue-800 rounded-full"></div>}</div><input type="radio" name={`q${q.id}`} className="hidden" checked={userAnswers[q.id]===o} onChange={()=>setUserAnswers({...userAnswers,[q.id]:o})}/><span className="text-sm font-medium">{o}</span></label>))}</div>}
                   {q.type==='multiple' && <div className="space-y-2 pl-0 md:pl-2">{q.options?.map((o,i)=>{const c=userAnswers[q.id]?.includes(o.charAt(0)); return <label key={i} className={`flex p-3 rounded border cursor-pointer hover:bg-blue-50 ${c?'border-blue-800 bg-blue-50':''}`}><div className={`min-w-[20px] h-[20px] rounded border-2 mr-3 flex items-center justify-center ${c?'border-blue-800 bg-blue-800':'border-slate-400'}`}>{c && <CheckSquare size={12} className="text-white"/>}</div><input type="checkbox" className="hidden" checked={c||false} onChange={e=>{const v=o.charAt(0); let a=userAnswers[q.id]?userAnswers[q.id].split(','):[]; if(e.target.checked) a.push(v); else a=a.filter(x=>x!==v); setUserAnswers({...userAnswers,[q.id]:a.sort().join(',')})}}/><span className="text-sm font-medium">{o}</span></label>})}</div>}
                   {(q.type==='short'||q.type==='fill') && <input className="w-full p-3 border rounded outline-none focus:border-blue-900 text-base" placeholder="Nhập đáp án..." value={userAnswers[q.id]||''} onChange={e=>setUserAnswers({...userAnswers,[q.id]:e.target.value})}/>}
                   {q.type==='essay' && <div className="relative"><textarea className="w-full p-3 border rounded outline-none focus:border-blue-900 min-h-[150px] text-base" placeholder="Nhập câu trả lời..." value={userAnswers[q.id]||''} onChange={e=>setUserAnswers({...userAnswers,[q.id]:e.target.value})}/><button onClick={()=>handleVoiceInput(`essay-${q.id}`, userAnswers[q.id]||'', v=>setUserAnswers({...userAnswers,[q.id]:v}))} className="absolute bottom-3 right-3 p-2 bg-slate-100 rounded hover:bg-blue-100"><Mic size={20}/></button></div>}
                </div>
             ))}
          </div>
       </div>

       {/* MODAL XÁC NHẬN NỘP BÀI */}
       {showSubmitModal && (
          <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-0 overflow-hidden border-t-8 border-yellow-500">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} className="text-yellow-600"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2 uppercase">Xác nhận nộp bài</h3>
                    <p className="text-sm text-slate-600 font-medium">
                        Đồng chí chắn chắn muốn nộp bài thi?<br/>
                        Đang còn thời gian, hãy kiểm tra lại đáp án.
                    </p>
                </div>
                <div className="flex border-t border-slate-200">
                    <button 
                        onClick={() => setShowSubmitModal(false)}
                        className="flex-1 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 border-r border-slate-200 uppercase transition-colors"
                    >
                        Kiểm tra lại
                    </button>
                    <button 
                        onClick={finishExam}
                        className="flex-1 py-4 text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 uppercase transition-colors"
                    >
                        Nộp ngay
                    </button>
                </div>
             </div>
          </div>
       )}

        {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
       {showLogoutModal && (
          <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-0 overflow-hidden border-t-8 border-red-600">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogOut size={32} className="text-red-600"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2 uppercase">Xác nhận đăng xuất</h3>
                    <p className="text-sm text-slate-600 font-medium">
                        Đồng chí muốn thoát khỏi hệ thống?<br/>
                        <span className="text-red-600 font-bold">Cảnh báo: Bài thi hiện tại sẽ bị hủy bỏ!</span>
                    </p>
                </div>
                <div className="flex border-t border-slate-200">
                    <button 
                        onClick={() => setShowLogoutModal(false)}
                        className="flex-1 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 border-r border-slate-200 uppercase transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={confirmLogoutCandidate}
                        className="flex-1 py-4 text-sm font-bold text-white bg-red-700 hover:bg-red-800 uppercase transition-colors"
                    >
                        Đăng xuất ngay
                    </button>
                </div>
             </div>
          </div>
       )}
    </div>
  );

  const renderResult = () => (
     <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded shadow-2xl w-full max-w-lg text-center border-t-8 border-yellow-500">
           <Award size={64} className="mx-auto text-yellow-500 mb-4"/>
           <h2 className="text-2xl font-black text-slate-800 uppercase mb-6">Hoàn thành bài thi</h2>
           <div className="my-8 bg-slate-50 p-6 rounded border mb-6"><span className="text-6xl font-black text-blue-900">{score}</span><span className="text-2xl text-slate-400 font-bold">/{maxScore}</span></div>
           <button onClick={()=>{setView('login'); setCurrentUser(null);}} className="w-full bg-slate-800 text-white py-3 rounded font-bold uppercase hover:bg-slate-900">Đăng xuất</button>
        </div>
     </div>
  );

  const renderAdmin = () => (
     <div className="min-h-screen bg-slate-100 p-6 font-sans">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-12 flex justify-between items-center bg-slate-900 text-white p-4 rounded shadow border-b-4 border-yellow-500">
              <h1 className="font-bold text-xl uppercase flex items-center gap-2"><Shield className="text-yellow-500"/> TRUNG TÂM CHỈ HUY</h1>
              <button onClick={()=>setView('login')} className="bg-red-700 px-4 py-2 rounded font-bold text-sm hover:bg-red-600">THOÁT</button>
           </div>

           {/* API KEY ACTIVATION BAR */}
           <div className="lg:col-span-12 bg-white p-4 rounded shadow border border-yellow-200 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2 items-center">
                 <div className={`p-2 rounded-full ${isSuperAdmin ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isSuperAdmin ? <Unlock size={24}/> : <LockIcon size={24}/>}
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 uppercase">Kích hoạt quyền Cao cấp</h3>
                    <p className="text-xs text-slate-500">{isSuperAdmin ? 'Đang hoạt động: Đầy đủ quyền hạn' : 'Đang khóa: Chỉ xem kết quả thi'}</p>
                 </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                 <input 
                    type="password" 
                    placeholder="Nhập API Key để mở khóa..." 
                    className="flex-1 md:w-80 border p-2 rounded text-sm focus:border-blue-900 outline-none"
                    value={isSuperAdmin ? sysConfig.apiKey : tempApiKey} // Show actual key if active, else temp
                    onChange={e => {
                        if (isSuperAdmin) setSysConfig({...sysConfig, apiKey: e.target.value});
                        else setTempApiKey(e.target.value);
                    }}
                    disabled={isSuperAdmin} // Disable editing if already active (users should assume it's set)
                 />
                 {isSuperAdmin ? (
                    <button 
                        onClick={() => {
                            if(confirm('Hủy kích hoạt quyền cao cấp?')) {
                                setSysConfig({...sysConfig, apiKey: ''});
                                setIsSuperAdmin(false);
                            }
                        }} 
                        className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700"
                    >
                        HỦY
                    </button>
                 ) : (
                    <button 
                        onClick={handleActivateApiKey} 
                        className="bg-green-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-green-700"
                    >
                        KÍCH HOẠT
                    </button>
                 )}
              </div>
           </div>
           
           {/* CỘT TRÁI */}
           <div className="lg:col-span-4 space-y-6">
              <div className={`bg-white p-4 rounded shadow border border-slate-300 ${!isSuperAdmin ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
                 <h3 className="font-bold text-slate-800 border-b pb-2 mb-3 text-sm uppercase flex gap-2"><Brain size={16} className="text-purple-700"/> Cấu hình Song Tử</h3>
                 {/* Removed API Key Input from here */}
                 <div className="flex gap-2 mb-3"><label className="flex gap-1 items-center text-xs font-bold"><input type="checkbox" checked={sysConfig.thinkingMode} onChange={e=>setSysConfig({...sysConfig,thinkingMode:e.target.checked})} disabled={!isSuperAdmin}/> Suy luận</label><label className="flex gap-1 items-center text-xs font-bold"><input type="checkbox" checked={sysConfig.useGoogleSearch} onChange={e=>setSysConfig({...sysConfig,useGoogleSearch:e.target.checked})} disabled={!isSuperAdmin}/> Google Search</label></div>
                 <div className="grid grid-cols-2 gap-2"><input type="number" className="border p-2 rounded text-xs text-center" value={sysConfig.examDuration} onChange={e=>setSysConfig({...sysConfig,examDuration:Number(e.target.value)})} disabled={!isSuperAdmin}/><input type="number" className="border p-2 rounded text-xs text-center" value={sysConfig.maxAttempts} onChange={e=>setSysConfig({...sysConfig,maxAttempts:Number(e.target.value)})} disabled={!isSuperAdmin}/></div>
              </div>
              
              <div className={`bg-white p-4 rounded shadow border border-slate-300 ${!isSuperAdmin ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
                 <h3 className="font-bold text-slate-800 border-b pb-2 mb-3 text-sm uppercase flex gap-2"><Lock size={16} className="text-red-700"/> Bảo mật</h3>
                 <div className="space-y-2">
                    <div className="flex gap-2 relative"><input type={showNewPassword?"text":"password"} placeholder="Mật khẩu mới..." className="w-full border p-2 rounded text-xs pr-8" value={newPassword} onChange={e=>setNewPassword(e.target.value)} disabled={!isSuperAdmin}/><button onClick={()=>setShowNewPassword(!showNewPassword)} className="absolute right-14 top-2 text-slate-400"><Eye size={14}/></button><button onClick={()=>{if(newPassword.length<4)return showNotify("Quá ngắn","error"); setSysConfig({...sysConfig,adminPassword:newPassword}); setNewPassword(''); showNotify("Đổi pass thành công","success")}} className="bg-slate-800 text-white px-2 rounded text-xs font-bold" disabled={!isSuperAdmin}>Đổi</button></div>
                    <div className="pt-2 border-t"><input className="w-full border p-2 rounded text-xs mb-1" value={sysConfig.adminEmail} onChange={e=>setSysConfig({...sysConfig,adminEmail:e.target.value})} disabled={!isSuperAdmin}/><input className="w-full border p-2 rounded text-xs mb-2" value={sysConfig.adminPhone} onChange={e=>setSysConfig({...sysConfig,adminPhone:e.target.value})} disabled={!isSuperAdmin}/><button onClick={handleSaveContactInfo} className="w-full bg-blue-600 text-white py-1 rounded text-xs font-bold flex justify-center gap-1" disabled={!isSuperAdmin}><Save size={12}/> Lưu thông tin LH</button></div>
                 </div>
              </div>

              {/* CLOUD SYNC CONFIG */}
              <div className={`bg-white p-4 rounded shadow border border-slate-300`}> 
                  <h3 className="font-bold text-slate-800 border-b pb-2 mb-3 text-sm uppercase flex gap-2">
                    <Cloud size={16} className="text-blue-500"/> Đồng bộ Đám mây
                  </h3>
                  <div className="space-y-2">
                    {/* BIN ID HIDDEN - AUTOMATICALLY MANAGED */}
                    <div className="relative">
                        <input 
                            type={showCloudKey ? "text" : "password"}
                            placeholder="Nhập Master Key từ JSONBin.io..." 
                            className="w-full border p-2 rounded text-xs pr-8" 
                            value={sysConfig.cloudApiKey} 
                            onChange={e=>setSysConfig({...sysConfig,cloudApiKey:e.target.value.trim()})} 
                        />
                        <button onClick={()=>setShowCloudKey(!showCloudKey)} className="absolute top-2 right-2 text-slate-400 hover:text-blue-600">
                           {showCloudKey ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <a href="https://jsonbin.io/app/api-keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline flex items-center gap-1 hover:text-blue-800">
                            <ExternalLink size={10}/> Lấy Key tại JSONBin.io
                        </a>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="w-3 h-3 text-blue-600 rounded" 
                                checked={sysConfig.autoSync} 
                                onChange={e=>setSysConfig({...sysConfig,autoSync:e.target.checked})} 
                            />
                            <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">Tự động {isSyncing && <RefreshCw size={8} className="animate-spin text-blue-600"/>}</span>
                        </label>
                    </div>

                    <button onClick={handleSaveCloudConfig} className="w-full bg-slate-700 text-white py-1 rounded text-xs font-bold mb-2">Lưu cấu hình Cloud</button>
                    
                    <div className="flex gap-2">
                       <button 
                           onClick={() => handlePushToCloud(false)} 
                           disabled={isSyncing || !sysConfig.cloudApiKey} 
                           className="w-full bg-blue-600 text-white py-3 rounded text-xs font-bold flex flex-col items-center gap-1 hover:bg-blue-700 disabled:bg-slate-400 shadow"
                           title={sysConfig.cloudBinId ? "Cập nhật dữ liệu lên Cloud" : "Tạo kho mới và đẩy dữ liệu lên"}
                       >
                          <UploadCloud size={20}/>
                          {isSyncing ? 'Đang đồng bộ...' : (sysConfig.cloudBinId ? 'CẬP NHẬT LÊN CLOUD' : 'KẾT NỐI & TẠO KHO MỚI')}
                       </button>
                    </div>
                    <p className="text-[9px] text-slate-400 italic text-center mt-1">Dữ liệu được lưu trữ an toàn trên JSONBin.io</p>
                  </div>
              </div>

              {/* KHO ĐỀ THI ĐÃ LƯU */}
              <div className={`bg-white p-4 rounded shadow border border-slate-300 ${!isSuperAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="font-bold text-slate-800 border-b pb-2 mb-3 text-sm uppercase flex gap-2"><List size={16} className="text-orange-600"/> KHO ĐỀ THI ĐÃ LƯU</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                      <div className="flex gap-2 mb-2">
                          <input 
                              type="file" 
                              accept=".json" 
                              onChange={handleImportSavedExamFile}
                              ref={repoInputRef}
                              className="hidden"
                          />
                          <button onClick={() => repoInputRef.current?.click()} className="flex-1 bg-blue-50 text-blue-700 py-1 rounded text-[10px] font-bold border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1" disabled={!isSuperAdmin}><UploadCloud size={12}/> Nhập kho</button>
                      </div>
                      {savedExams.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center italic">Chưa có đề thi nào được lưu.</p>
                      ) : (
                          savedExams.map((exam) => (
                              <div key={exam.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-200 hover:bg-orange-50 group">
                                  <div className="overflow-hidden">
                                      <p className="text-xs font-bold text-slate-800 truncate w-24" title={exam.name}>{exam.name}</p>
                                      <p className="text-[10px] text-slate-500">{new Date(exam.createdAt).toLocaleDateString('vi-VN')}</p>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleUseSavedExam(exam)} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Sử dụng"><CheckSquare size={12}/></button>
                                      <button onClick={() => handleExportSavedExamFile(exam)} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Xuất file"><FileJson size={12}/></button>
                                      <button onClick={() => handleDeleteSavedExam(exam.id)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Xóa"><Trash2 size={12}/></button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              <div className={`bg-white p-4 rounded shadow border border-slate-300 ${!isSuperAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="font-bold text-slate-800 border-b pb-2 mb-3 text-sm uppercase flex justify-between items-center"><div className="flex gap-2"><FileText size={16} className="text-blue-800"/> Soạn thảo</div><button onClick={()=>setSysConfig({...sysConfig,fastMode:!sysConfig.fastMode})} className={`p-1 rounded ${sysConfig.fastMode?'bg-yellow-400':'bg-slate-100'}`} title="Phản hồi nhanh"><FastForward size={14}/></button></h3>
                  <div className="flex bg-slate-100 p-1 rounded mb-3"><button onClick={()=>setGenMode('file')} className={`flex-1 py-1 text-xs font-bold rounded ${genMode==='file'?'bg-white shadow text-blue-900':'text-slate-500'}`}>FILE</button><button onClick={()=>setGenMode('topic')} className={`flex-1 py-1 text-xs font-bold rounded ${genMode==='topic'?'bg-white shadow text-purple-900':'text-slate-500'}`}>CHỦ ĐỀ</button></div>
                  
                  {genMode === 'file' ? (
                     <div className="space-y-2">
                        <div className="border-2 border-dashed p-3 bg-slate-50 text-center relative cursor-pointer"><input type="file" className="absolute inset-0 opacity-0" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onloadend=()=>{setFileBase64(r.result?.toString().split(',')[1] || null);setSelectedFile(f)};r.readAsDataURL(f)}}} ref={fileInputRef} disabled={!isSuperAdmin}/><div className="text-xs text-slate-500">{selectedFile?selectedFile.name:'Tải PDF/Ảnh'}</div></div>
                        <textarea className="w-full h-20 border p-2 rounded text-xs" placeholder="Hoặc dán nội dung..." value={examContent} onChange={e=>setExamContent(e.target.value)} disabled={!isSuperAdmin}></textarea>
                        <div className="bg-slate-50 p-2 rounded border"><label className="text-[9px] font-bold text-slate-500 block mb-1">CẤU HÌNH ĐIỂM (FILE)</label><div className="grid grid-cols-5 gap-1 text-[8px] text-center"><div className="flex flex-col"><span>1ĐA</span><input type="number" className="border w-full text-center" value={filePointConfig.single} onChange={e=>setFilePointConfig({...filePointConfig,single:Number(e.target.value)})}/></div><div className="flex flex-col"><span>N.ĐA</span><input type="number" className="border w-full text-center" value={filePointConfig.multiple} onChange={e=>setFilePointConfig({...filePointConfig,multiple:Number(e.target.value)})}/></div><div className="flex flex-col"><span>Ngắn</span><input type="number" className="border w-full text-center" value={filePointConfig.short} onChange={e=>setFilePointConfig({...filePointConfig,short:Number(e.target.value)})}/></div><div className="flex flex-col"><span>Điền</span><input type="number" className="border w-full text-center" value={filePointConfig.fill} onChange={e=>setFilePointConfig({...filePointConfig,fill:Number(e.target.value)})}/></div><div className="flex flex-col"><span>Luận</span><input type="number" className="border w-full text-center" value={filePointConfig.essay} onChange={e=>setFilePointConfig({...filePointConfig,essay:Number(e.target.value)})}/></div></div></div>
                     </div>
                  ) : (
                     <div className="space-y-2">
                        {/* MENU CHỌN MẪU ĐỀ */}
                        <div className="relative">
                           <button onClick={() => document.getElementById('preset-menu')?.classList.toggle('hidden')} className="w-full text-left bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-bold px-2 py-1.5 rounded flex justify-between items-center" disabled={!isSuperAdmin}>
                               <span><BookOpen size={10} className="inline mr-1"/> Chọn mẫu đề thi có sẵn...</span><ChevronRight size={12}/>
                           </button>
                           <div id="preset-menu" className="hidden absolute z-10 top-full left-0 w-full bg-white shadow-lg border rounded max-h-40 overflow-y-auto mt-1">
                               {EXAM_PRESETS.map((p, i) => (
                                   <div key={i} onClick={() => {
                                       handleApplyPreset(p);
                                       document.getElementById('preset-menu')?.classList.add('hidden');
                                   }} className="px-2 py-2 text-[10px] hover:bg-purple-50 cursor-pointer border-b last:border-0">
                                       {p.name}
                                   </div>
                               ))}
                           </div>
                        </div>

                        <div className="relative"><input className="w-full p-2 border rounded text-xs pr-6" placeholder="Chủ đề" value={topicConfig.subject} onChange={e=>setTopicConfig({...topicConfig,subject:e.target.value})} disabled={!isSuperAdmin}/><button onClick={()=>handleVoiceInput('sub',topicConfig.subject,v=>setTopicConfig({...topicConfig,subject:v}))} className="absolute right-1 top-1 text-slate-400" disabled={!isSuperAdmin}><Mic size={12}/></button></div>
                        <div className="relative"><input className="w-full p-2 border rounded text-xs pr-6" placeholder="Bài học" value={topicConfig.lesson} onChange={e=>setTopicConfig({...topicConfig,lesson:e.target.value})} disabled={!isSuperAdmin}/><button onClick={()=>handleVoiceInput('les',topicConfig.lesson,v=>setTopicConfig({...topicConfig,lesson:v}))} className="absolute right-1 top-1 text-slate-400" disabled={!isSuperAdmin}><Mic size={12}/></button></div>
                        
                        <div className="bg-slate-50 p-2 rounded border">
                            {/* HEADER CẤU HÌNH */}
                            <div className="flex justify-between items-center border-b pb-1 mb-1">
                                <label className="text-[10px] font-bold text-slate-500 w-20">LOẠI CÂU HỎI</label>
                                <label className="text-[10px] font-bold text-slate-500 w-10 text-center">SL</label>
                                <label className="text-[10px] font-bold text-slate-500 w-10 text-center">ĐIỂM</label>
                            </div>
                            
                            {/* DANH SÁCH INPUT */}
                            <div className="space-y-1.5">
                                {Object.keys(topicConfig.typeCounts).map(key => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-slate-700 w-20">{QUESTION_TYPE_LABELS[key]}</span>
                                        <input 
                                            type="number" 
                                            className="w-10 p-1 border rounded text-[10px] text-center"
                                            value={topicConfig.typeCounts[key as keyof typeof topicConfig.typeCounts]} 
                                            onChange={e => setTopicConfig({
                                                ...topicConfig, 
                                                typeCounts: { ...topicConfig.typeCounts, [key]: Number(e.target.value) }
                                            })}
                                            disabled={!isSuperAdmin}
                                        />
                                        <input 
                                            type="number" 
                                            className="w-10 p-1 border rounded text-[10px] text-center bg-blue-50"
                                            value={topicConfig.typePoints[key as keyof typeof topicConfig.typePoints]} 
                                            onChange={e => setTopicConfig({
                                                ...topicConfig, 
                                                typePoints: { ...topicConfig.typePoints, [key]: Number(e.target.value) }
                                            })}
                                            disabled={!isSuperAdmin}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* TỔNG KẾT */}
                            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[10px] font-bold text-blue-800">
                                <span>TỔNG CỘNG:</span>
                                <span>{totalQuestionsCount} câu / {totalQuestionsPoints} điểm</span>
                            </div>
                        </div>
                     </div>
                  )}
                  <button onClick={handleGenerateExam} disabled={isLoading || !isSuperAdmin} className={`w-full mt-3 py-2 rounded font-bold text-xs text-white uppercase ${isLoading?'bg-slate-400':'bg-blue-900'}`}>{isLoading?'Đang tạo...':'Khởi tạo'}</button>
              </div>
           </div>

           {/* CỘT PHẢI */}
           <div className="lg:col-span-8 bg-white p-4 rounded shadow border border-slate-300 flex flex-col h-full">
              <div className="flex justify-between border-b pb-2 mb-4">
                 <div className="flex gap-3">
                    <button onClick={()=>setAdminTab('questions')} className={`text-sm font-bold pb-1 border-b-2 ${adminTab==='questions'?'border-blue-800 text-blue-800':'border-transparent text-slate-400'}`}>NGÂN HÀNG CÂU HỎI</button>
                    <button onClick={()=>setAdminTab('results')} className={`text-sm font-bold pb-1 border-b-2 ${adminTab==='results'?'border-blue-800 text-blue-800':'border-transparent text-slate-400'}`}>KẾT QUẢ</button>
                 </div>
                 {adminTab==='results' && <button onClick={handleExportExcel} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-green-700"><FileSpreadsheet size={12}/> Xuất Excel</button>}
                 {adminTab==='questions' && <div className={`flex gap-2 ${!isSuperAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button onClick={() => { if(confirm('Tạo lại đề thi mới từ cấu hình hiện tại?')) handleGenerateExam() }} disabled={isLoading} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold border border-purple-200 flex items-center gap-1 hover:bg-purple-200"><RefreshCw size={12} className={isLoading?"animate-spin":""}/> {isLoading ? 'Đang tạo...' : 'Tạo lại'}</button>
                    <button onClick={handleSaveCurrentExam} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold border border-orange-200 flex items-center gap-1 hover:bg-orange-200"><Archive size={12}/> Lưu vào kho</button><button onClick={handleCopyExamText} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold border border-green-200 flex items-center gap-1"><ClipboardCopy size={12}/> Copy</button><button onClick={handleExportWord} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold border border-blue-200 flex items-center gap-1"><FileDown size={12}/> Word</button><button onClick={handleExportPDF} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold border border-red-200 flex items-center gap-1" title="Lưu PDF về máy"><Save size={12}/> Lưu PDF</button><button onClick={handleShuffle} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded text-xs font-bold hover:bg-white border hover:text-blue-800 uppercase ml-2"><Shuffle size={14}/> Trộn</button></div>}
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 p-4 rounded border">
                 {adminTab === 'questions' ? (
                    isSuperAdmin ? (
                        <div className="space-y-3">
                            {questions.length===0 ? <div className="text-center text-slate-400 py-10">Trống</div> : questions.map((q,i) => (
                                <div key={q.id} className="bg-white p-3 rounded shadow-sm border relative">
                                    <button onClick={()=>{if(window.confirm("Xóa?"))setQuestions(questions.filter(x=>x.id!==q.id))}} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                    <h4 className="font-bold text-xs mb-1"><span className="bg-slate-200 px-1 rounded mr-1">{QUESTION_TYPE_LABELS[q.type]}</span>{q.question} ({q.points}đ)</h4>
                                    
                                    {/* DISPLAY OPTIONS FOR SINGLE/MULTIPLE */}
                                    {(q.type==='single'||q.type==='multiple') && 
                                        <div className="pl-2 grid grid-cols-1 gap-1">
                                            {q.options?.map((o,j) => (
                                                <div key={j} className={`text-[10px] p-1 border rounded ${((q.type==='single'&&o.startsWith(q.correct_answer))||(q.type==='multiple'&&q.correct_answer.includes(o.charAt(0))))?'bg-green-50 border-green-300 font-bold text-green-800':''}`}>
                                                    {o}
                                                </div>
                                            ))}
                                        </div>
                                    }

                                    {/* DISPLAY ANSWER FOR SHORT/FILL */}
                                    {(q.type === 'short' || q.type === 'fill') && (
                                        <div className="mt-1 pl-1 text-[10px] text-green-700">
                                            <span className="font-bold bg-green-100 px-1 rounded mr-1">ĐÁP ÁN:</span>{q.correct_answer}
                                        </div>
                                    )}

                                    {/* DISPLAY SUGGESTED ANSWER FOR ESSAY */}
                                    {q.type === 'essay' && (
                                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-slate-700">
                                            <span className="font-bold text-yellow-800 block mb-1 border-b border-yellow-200 pb-1">GỢI Ý TRẢ LỜI (Dành cho Giáo viên chấm):</span>
                                            <p className="whitespace-pre-wrap leading-relaxed">{q.correct_answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <LockIcon size={48} className="mb-2 text-slate-300"/>
                            <p className="font-bold text-sm">NỘI DUNG BỊ KHÓA</p>
                            <p className="text-xs">Vui lòng kích hoạt quyền Admin Cao cấp để xem và chỉnh sửa đề thi.</p>
                        </div>
                    )
                 ) : (
                    <table className="w-full text-xs text-left"><thead className="bg-slate-200 font-bold"><tr><th className="p-2">Thời gian</th><th className="p-2">Thí sinh</th><th className="p-2 text-center">Điểm</th></tr></thead><tbody>{examResults.map(r=><tr key={r.id} className="border-b bg-white"><td className="p-2">{r.timestamp}</td><td className="p-2 font-bold">{r.user.ho_ten}</td><td className="p-2 text-center font-bold text-blue-800">{r.score}/{r.totalScore}</td></tr>)}</tbody></table>
                 )}
              </div>
           </div>
        </div>
     </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen">
      {notification && <div className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded shadow-xl text-white font-bold animate-bounce flex items-center gap-2 text-sm ${notification.type==='error'?'bg-red-700':'bg-green-700'}`}>{notification.msg}</div>}
      {view === 'login' && renderLogin()}
      {view === 'register' && renderRegister()}
      {view === 'exam' && renderExam()}
      {view === 'result' && renderResult()}
      {view === 'admin' && renderAdmin()}
    </div>
  );
}