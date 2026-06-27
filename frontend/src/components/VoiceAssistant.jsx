import React, { useState, useEffect, memo } from 'react';
import { useLanguage } from '../context/LanguageContext';

const VoiceAssistant = ({ 
  dailyKWh = 0, 
  estimatedBill = 0, 
  dailyCost = 0, 
  onNavigate, 
  roomNumber = '' 
}) => {
  const { t, formatNumber, language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [supported, setSupported] = useState(true);

  let recognition = null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, [SpeechRecognition]);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!SpeechRecognition) return;
    
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setResponse('');
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript.toLowerCase();
      setTranscript(speechToText);
      handleVoiceCommand(speechToText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleVoiceCommand = (command) => {
    let reply = '';
    const cleanCommand = command.trim();
    const dailyCO2 = dailyKWh * 0.67;
    const treeDays = dailyCO2 / 0.06;

    if (language === 'bn') {
      // 1. Carbon Footprint
      if (cleanCommand.includes('কার্বন') || cleanCommand.includes('পরিবেশ') || cleanCommand.includes('নির্গমন')) {
        reply = `আজ আপনার কার্বন ফুটপ্রিন্ট আনুমানিক ${formatNumber(dailyCO2, 3)} কেজি CO₂। এটি শোষণের জন্য ${formatNumber(treeDays, 1)}টি গাছ প্রয়োজন। কার্বন ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে।`;
        setResponse(reply);
        speak(reply);
        if (onNavigate) {
          setTimeout(() => onNavigate('carbon'), 4000);
        }
        return;
      }
      
      // 2. Payment Page Redirect
      if (cleanCommand.includes('পেমেন্ট') || cleanCommand.includes('বিল মেটাতে') || cleanCommand.includes('টাকা জমা')) {
        reply = `আপনাকে পেমেন্ট পেজে রিডাইরেক্ট করা হচ্ছে। আপনার মোট প্রদেয় বিল ${formatNumber(estimatedBill, 2)} টাকা।`;
        setResponse(reply);
        speak(reply);
        if (onNavigate) {
          setTimeout(() => onNavigate('payment'), 3000);
        }
        return;
      }

      // 3. Today's Report
      if (cleanCommand.includes('রিপোর্ট') || cleanCommand.includes('সারসংক্ষেপ') || cleanCommand.includes('অবস্থা')) {
        reply = `রুম ${formatNumber(roomNumber)} এর আজকের রিপোর্ট: বিদ্যুৎ ব্যবহার ${formatNumber(dailyKWh, 3)} ইউনিট, যার আনুমানিক খরচ ${formatNumber(dailyCost, 2)} টাকা এবং কার্বন ফুটপ্রিন্ট ${formatNumber(dailyCO2, 3)} কেজি।`;
      }
      
      // 4. Electricity Consumption (Unit vs Taka)
      else if (cleanCommand.includes('ইউনিট') || cleanCommand.includes('বিদ্যুৎ ব্যবহার') || cleanCommand.includes('ব্যবহার')) {
        reply = `আজ আপনি ${formatNumber(dailyKWh, 3)} ইউনিট বিদ্যুৎ ব্যবহার করেছেন।`;
      } 
      else if (cleanCommand.includes('টাকা') || cleanCommand.includes('খরচ') || cleanCommand.includes('বিল')) {
        reply = `আজকের বিদ্যুৎ খরচের পরিমাণ ${formatNumber(dailyCost, 2)} টাকা এবং মোট আনুমানিক মাসিক বিল ${formatNumber(estimatedBill, 2)} টাকা।`;
      } 
      
      // Fallback
      else {
        reply = `দুঃখিত, আমি বুঝতে পারিনি। অনুগ্রহ করে 'রিপোর্ট', 'পেমেন্ট', 'কার্বন ফুটপ্রিন্ট' অথবা 'বিদ্যুৎ ব্যবহার' সম্পর্কে জিজ্ঞাসা করুন।`;
      }
    } else {
      // 1. Carbon Footprint
      if (cleanCommand.includes('carbon') || cleanCommand.includes('co2') || cleanCommand.includes('footprint') || cleanCommand.includes('emission') || cleanCommand.includes('environment')) {
        reply = `Your estimated carbon footprint today is ${dailyCO2.toFixed(3)} kg of CO₂, requiring ${treeDays.toFixed(1)} tree-days of absorption. Redirecting you to the Carbon Dashboard.`;
        setResponse(reply);
        speak(reply);
        if (onNavigate) {
          setTimeout(() => onNavigate('carbon'), 4500);
        }
        return;
      }

      // 2. Payment Page Redirect
      if (cleanCommand.includes('pay') || cleanCommand.includes('payment') || cleanCommand.includes('checkout') || cleanCommand.includes('deposit')) {
        reply = `Redirecting you to the bill payment page. Your total payable amount is ${estimatedBill.toFixed(2)} Taka.`;
        setResponse(reply);
        speak(reply);
        if (onNavigate) {
          setTimeout(() => onNavigate('payment'), 3000);
        }
        return;
      }

      // 3. Today's Report
      if (cleanCommand.includes('report') || cleanCommand.includes('summary') || cleanCommand.includes('status')) {
        reply = `Today's report for Room ${roomNumber}: You consumed ${dailyKWh.toFixed(3)} kilowatt-hours of electricity, costing ${dailyCost.toFixed(2)} Taka, with a carbon footprint of ${dailyCO2.toFixed(3)} kg of CO₂.`;
      }

      // 4. Electricity Consumption (Unit vs Taka)
      else if (cleanCommand.includes('unit') || cleanCommand.includes('usage') || cleanCommand.includes('energy') || cleanCommand.includes('consumption') || cleanCommand.includes('consume') || cleanCommand.includes('kwh')) {
        reply = `Today you consumed ${dailyKWh.toFixed(3)} units of electricity.`;
      } 
      else if (cleanCommand.includes('cost') || cleanCommand.includes('taka') || cleanCommand.includes('price') || cleanCommand.includes('money') || cleanCommand.includes('charge') || cleanCommand.includes('how much')) {
        reply = `Today's cost is ${dailyCost.toFixed(2)} Taka, and your total estimated bill is ${estimatedBill.toFixed(2)} Taka.`;
      } 
      
      // Fallback
      else {
        reply = `Sorry, I did not recognize that command. Please ask for 'today's report', 'bill payment', 'carbon footprint', or 'daily usage'.`;
      }
    }

    setResponse(reply);
    speak(reply);
  };

  if (!supported) {
    return (
      <div className="glass-card p-5 text-center text-xs text-slate-500">
        🎙️ Voice command recognition is not supported in this browser.
      </div>
    );
  }

  return (
    <div className="glass-card p-6 flex flex-col gap-4 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🎙️</span> {language === 'bn' ? 'ভয়েস অ্যাসিস্ট্যান্ট' : 'Voice Assistant'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'bn' 
              ? "ম্যাক্রোফোন টিপে 'রিপোর্ট', 'পেমেন্ট', 'কার্বন' বা 'বিদ্যুৎ ব্যবহার' জিজ্ঞাসা করুন" 
              : "Click the mic to ask for 'today's report', 'payment', 'carbon footprint', or 'usage'"}
          </p>
        </div>
        <button
          onClick={startListening}
          disabled={isListening}
          className={`h-12 w-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
            isListening 
              ? 'bg-red-500 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
              : 'bg-brand-500 hover:bg-brand-600 text-white shadow-[0_0_15px_rgba(37,162,101,0.3)] hover:scale-105'
          }`}
        >
          {isListening ? '🛑' : '🎙️'}
        </button>
      </div>

      {transcript && (
        <div className="bg-slate-100 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-500 dark:text-slate-400">{language === 'bn' ? 'আপনি বলেছেন: ' : 'You said: '}</span>
          <span className="italic">"{transcript}"</span>
        </div>
      )}

      {response && (
        <div className="bg-brand-500/10 border border-brand-500/20 p-3 rounded-lg text-sm text-brand-700 dark:text-brand-300">
          <span className="font-semibold text-brand-600 dark:text-brand-400">{language === 'bn' ? 'উত্তর: ' : 'Response: '}</span>
          <span>{response}</span>
        </div>
      )}
    </div>
  );
};

export default memo(VoiceAssistant);
