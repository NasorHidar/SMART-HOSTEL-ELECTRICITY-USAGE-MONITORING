import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, MessageSquare, Loader2, Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const VoiceAssistantWidget = ({ 
  dailyKWh = 0, 
  estimatedBill = 0, 
  dailyCost = 0, 
  onNavigate, 
  roomNumber = '' 
}) => {
  const { t, formatNumber, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | listening | processing | speaking
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [supported, setSupported] = useState(true);

  // Refs for Speech API
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
    } else {
      setSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      // Clean up when closing
      if (status === 'listening' && recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current && synthesisRef.current.speaking) {
        synthesisRef.current.cancel();
      }
      setStatus('idle');
      setTranscript('');
      setResponse('');
    }
  };

  const startListening = () => {
    if (!supported || !recognitionRef.current) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }
    setTranscript('');
    setResponse('');
    setStatus('listening');
    
    recognitionRef.current.lang = language === 'bn' ? 'bn-BD' : 'en-US';

    recognitionRef.current.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      handleProcessInput(speechToText);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setStatus('idle');
    };

    recognitionRef.current.onend = () => {
      // Handled in onresult or onerror
    };

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setStatus('idle');
  };

  const handleProcessInput = (command) => {
    if (!command) {
      setStatus('idle');
      return;
    }
    setStatus('processing');
    
    setTimeout(() => {
      let reply = '';
      const cleanCommand = command.toLowerCase().trim();
      const dailyCO2 = dailyKWh * 0.67;
      const treeDays = dailyCO2 / 0.06;

      if (language === 'bn') {
        if (cleanCommand.includes('কার্বন') || cleanCommand.includes('পরিবেশ') || cleanCommand.includes('নির্গমন')) {
          reply = `আজ আপনার কার্বন ফুটপ্রিন্ট আনুমানিক ${formatNumber(dailyCO2, 3)} কেজি CO₂। এটি শোষণের জন্য ${formatNumber(treeDays, 1)}টি গাছ প্রয়োজন। কার্বন ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে।`;
          if (onNavigate) setTimeout(() => onNavigate('carbon'), 4000);
        } else if (cleanCommand.includes('পেমেন্ট') || cleanCommand.includes('বিল মেটাতে') || cleanCommand.includes('টাকা জমা')) {
          reply = `আপনাকে পেমেন্ট পেজে রিডাইরেক্ট করা হচ্ছে। আপনার মোট প্রদেয় বিল ${formatNumber(estimatedBill, 2)} টাকা।`;
          if (onNavigate) setTimeout(() => onNavigate('payment'), 3000);
        } else if (cleanCommand.includes('রিপোর্ট') || cleanCommand.includes('সারসংক্ষেপ') || cleanCommand.includes('অবস্থা')) {
          reply = `রুম ${formatNumber(roomNumber)} এর আজকের রিপোর্ট: বিদ্যুৎ ব্যবহার ${formatNumber(dailyKWh, 3)} ইউনিট, যার আনুমানিক খরচ ${formatNumber(dailyCost, 2)} টাকা এবং কার্বন ফুটপ্রিন্ট ${formatNumber(dailyCO2, 3)} কেজি।`;
        } else if (cleanCommand.includes('ইউনিট') || cleanCommand.includes('বিদ্যুৎ ব্যবহার') || cleanCommand.includes('ব্যবহার')) {
          reply = `আজ আপনি ${formatNumber(dailyKWh, 3)} ইউনিট বিদ্যুৎ ব্যবহার করেছেন।`;
        } else if (cleanCommand.includes('টাকা') || cleanCommand.includes('খরচ') || cleanCommand.includes('বিল')) {
          reply = `আজকের বিদ্যুৎ খরচের পরিমাণ ${formatNumber(dailyCost, 2)} টাকা এবং মোট আনুমানিক মাসিক বিল ${formatNumber(estimatedBill, 2)} টাকা।`;
        } else {
          reply = `দুঃখিত, আমি বুঝতে পারিনি। অনুগ্রহ করে 'রিপোর্ট', 'পেমেন্ট', 'কার্বন ফুটপ্রিন্ট' অথবা 'বিদ্যুৎ ব্যবহার' সম্পর্কে জিজ্ঞাসা করুন।`;
        }
      } else {
        if (cleanCommand.includes('carbon') || cleanCommand.includes('co2') || cleanCommand.includes('footprint') || cleanCommand.includes('emission') || cleanCommand.includes('environment')) {
          reply = `Your estimated carbon footprint today is ${dailyCO2.toFixed(3)} kg of CO₂, requiring ${treeDays.toFixed(1)} tree-days of absorption. Redirecting you to the Carbon Dashboard.`;
          if (onNavigate) setTimeout(() => onNavigate('carbon'), 4500);
        } else if (cleanCommand.includes('pay') || cleanCommand.includes('payment') || cleanCommand.includes('checkout') || cleanCommand.includes('deposit')) {
          reply = `Redirecting you to the bill payment page. Your total payable amount is ${estimatedBill.toFixed(2)} Taka.`;
          if (onNavigate) setTimeout(() => onNavigate('payment'), 3000);
        } else if (cleanCommand.includes('report') || cleanCommand.includes('summary') || cleanCommand.includes('status')) {
          reply = `Today's report for Room ${roomNumber}: You consumed ${dailyKWh.toFixed(3)} kilowatt-hours of electricity, costing ${dailyCost.toFixed(2)} Taka, with a carbon footprint of ${dailyCO2.toFixed(3)} kg of CO₂.`;
        } else if (cleanCommand.includes('unit') || cleanCommand.includes('usage') || cleanCommand.includes('energy') || cleanCommand.includes('consumption') || cleanCommand.includes('consume') || cleanCommand.includes('kwh')) {
          reply = `Today you consumed ${dailyKWh.toFixed(3)} units of electricity.`;
        } else if (cleanCommand.includes('cost') || cleanCommand.includes('taka') || cleanCommand.includes('price') || cleanCommand.includes('money') || cleanCommand.includes('charge') || cleanCommand.includes('how much')) {
          reply = `Today's cost is ${dailyCost.toFixed(2)} Taka, and your total estimated bill is ${estimatedBill.toFixed(2)} Taka.`;
        } else {
          reply = `Sorry, I did not recognize that command. Please ask for 'today's report', 'bill payment', 'carbon footprint', or 'daily usage'.`;
        }
      }

      setResponse(reply);
      setStatus('speaking');
      speakResponse(reply);
    }, 800);
  };

  const speakResponse = (text) => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.onend = () => {
      setStatus('idle');
    };
    synthesisRef.current.speak(utterance);
  };

  if (!supported) return null; // Or render a fallback

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4 font-sans">
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl p-5 transform transition-all duration-300 animate-slide-up flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-500" />
              {language === 'bn' ? 'ভয়েস অ্যাসিস্ট্যান্ট' : 'Smart Assistant'}
            </h3>
            <button onClick={toggleWidget} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-[160px] max-h-[300px] overflow-y-auto mb-4 space-y-4 pr-2">
            {transcript && (
              <div className="flex justify-end animate-fade-in">
                <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[85%] shadow-sm">
                  {transcript}
                  {status === 'listening' && (
                    <span className="inline-block ml-1 animate-pulse">...</span>
                  )}
                </div>
              </div>
            )}

            {status === 'processing' && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  {language === 'bn' ? 'চিন্তা করছি...' : 'Thinking...'}
                </div>
              </div>
            )}

            {response && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] shadow-sm leading-relaxed">
                  {response}
                </div>
              </div>
            )}

            {!transcript && status === 'idle' && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2 mt-8">
                <Volume2 className="w-8 h-8 opacity-50" />
                <p className="text-sm text-center">
                  {language === 'bn' 
                    ? "ম্যাক্রোফোন টিপে 'রিপোর্ট', 'পেমেন্ট', 'কার্বন' বা 'বিদ্যুৎ ব্যবহার' জিজ্ঞাসা করুন" 
                    : "Tap the mic and say something like 'Show my dashboard' or 'Payment history'"}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="relative">
              {status === 'listening' && (
                <div className="absolute inset-0 bg-brand-500 rounded-full animate-ripple opacity-30"></div>
              )}
              <button 
                onClick={status === 'listening' ? stopListening : startListening}
                className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
                  status === 'listening' 
                    ? 'bg-red-500 hover:bg-red-600 text-white scale-110' 
                    : 'bg-brand-500 hover:bg-brand-600 text-white hover:scale-105'
                }`}
              >
                {status === 'speaking' ? (
                   <div className="flex items-center gap-1">
                     {[...Array(4)].map((_, i) => (
                       <div key={i} className="w-1 bg-white rounded-full animate-soundwave" style={{ animationDelay: `${i * 0.15}s` }}></div>
                     ))}
                   </div>
                ) : (
                  <Mic className={`w-6 h-6 ${status === 'listening' ? 'animate-pulse' : ''}`} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={toggleWidget}
          className="relative flex items-center justify-center w-14 h-14 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 group"
        >
          <Mic className="w-6 h-6 group-hover:animate-pulse-slow" />
          <div className="absolute inset-0 bg-brand-500 rounded-full animate-ripple opacity-20 pointer-events-none delay-700"></div>
        </button>
      )}
    </div>
  );
};

export default VoiceAssistantWidget;
