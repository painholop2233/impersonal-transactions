import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Clock, 
  Layers, 
  TrendingUp, 
  Sparkles, 
  X,
  Play,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [scriptCode, setScriptCode] = useState<string>('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetch('/google_sheets_script.js')
      .then(res => res.text())
      .then(text => setScriptCode(text))
      .catch(err => console.warn('Could not load script:', err));
  }, []);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([scriptCode], { type: 'application/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'google_sheets_moex_delta.js');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const testEndpoint = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('https://impersonal-transactions.onrender.com/api/moex/instruments-list');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTestResult(`Сервер доступен! Получено ${data.total} тикеров (включая CNYRUBF, SBER, GAZP).`);
    } catch (e: any) {
      setTestResult(`Тест доступности: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Скрипт для Google Таблиц (Google Apps Script)</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
                  Авто 23:55 МСК
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Автоматический опрос сайта, создание вкладок под каждый тикер, фиксация дельты в ₽ и построение графиков
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          
          {/* Important Syntax Fix Alert */}
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-200 text-xs block">
                Как устранить ошибку «SyntaxError: Unexpected token &apos;&#125;&apos;, строка 388»:
              </span>
              <p className="text-amber-300/80 text-[11px] leading-relaxed">
                Google Apps Script при открытии нового файла создает пустую заготовку <code>function myFunction() &#123; &#125;</code>.
                Перед вставкой обязательно нажмите в редакторе Google клавиши <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-[10px]">Ctrl + A</kbd> и затем <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-[10px]">Delete</kbd>, чтобы файл <strong>Код.gs</strong> стал полностью пустым, и только после этого вставляйте скрипт.
              </p>
            </div>
          </div>

          {/* Quick Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                <Layers className="w-4 h-4" />
                <span>Лист на каждый тикер</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Скрипт создает отдельные листы: <strong>CNYRUBF</strong>, <strong>SBER</strong>, <strong>GAZP</strong>, <strong>SiZ6</strong> и сводку.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                <Clock className="w-4 h-4" />
                <span>Запуск в 23:55 МСК + Меню</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Авто-сбор каждый день в 23:55 по таймеру + собственное меню «MOEX Дельта» в Google Таблице для ручного запуска.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <TrendingUp className="w-4 h-4" />
                <span>Подробный график дня (как на сайте)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Полный внутридневной таймлайн на 23:55 МСК: поминутный ход цены и кумулятивной дельты в рублях, сессии и KPI дня.
              </p>
            </div>
          </div>

          {/* Step-by-Step Installation Guide */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Пошаговая установка в Google Таблицу (1 минута):</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={testEndpoint}
                  disabled={isTesting}
                  className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition-colors"
                >
                  <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Проверить API Render</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className="bg-blue-950/40 border border-blue-800/60 text-blue-300 p-2.5 rounded text-[11px]">
                {testResult}
              </div>
            )}

            <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-850">
              <div className="p-3 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <div>
                  <span className="font-semibold text-white">Откройте Google Таблицу</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Создайте новую таблицу на Google Диске (или откройте существующую).
                  </p>
                </div>
              </div>

              <div className="p-3 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <div>
                  <span className="font-semibold text-white">Перейдите в редактор скриптов</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    В верхнем меню таблицы нажмите: <strong>«Расширения» (Extensions) → «Apps Script»</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 flex items-start gap-3 bg-amber-950/20">
                <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <div>
                  <span className="font-semibold text-amber-300">Очистите файл Код.gs и вставьте код</span>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Нажмите <kbd className="font-mono bg-slate-800 px-1 rounded">Ctrl+A</kbd> и <kbd className="font-mono bg-slate-800 px-1 rounded">Delete</kbd>, чтобы удалить всё содержимое файла (включая скобки <code>&#123;&#125;</code>), скопируйте код кнопкой ниже и вставьте его. Нажмите <strong>«Сохранить» (Ctrl+S)</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                <div>
                  <span className="font-semibold text-white">Установите авто-запуск в 23:55 МСК</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    В выпадающем списке сверху выберите функцию <strong>setupDailyTrigger2355MSK</strong> и нажмите кнопку <strong>«Выполнить» (Run)</strong>. Предоставьте стандартные разрешения Google.
                  </p>
                </div>
              </div>

              <div className="p-3 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-xs">5</span>
                <div>
                  <span className="font-semibold text-emerald-300">Готово! Обновите Google Таблицу (F5)</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    В таблице появится меню <strong>«MOEX Дельта»</strong> с кнопкой <strong>«Собрать данные сейчас (Все тикеры)»</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons & Code Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                <span>Проверенный код скрипта (Google Apps Script · <code>Код.gs</code>)</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadScript}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
                  title="Скачать файл скрипта .js на компьютер"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .js</span>
                </button>

                <button
                  onClick={handleCopyCode}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-all shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Код скопирован в буфер!' : 'Скопировать весь код'}</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative rounded-lg border border-slate-800 bg-slate-950 font-mono text-[11px] max-h-72 overflow-y-auto p-4 text-slate-300">
              <pre className="whitespace-pre">{scriptCode}</pre>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Источник данных:</span>
            <code className="text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
              https://impersonal-transactions.onrender.com
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-4 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded transition-colors"
            >
              {copied ? 'Скопировано!' : 'Скопировать код'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
