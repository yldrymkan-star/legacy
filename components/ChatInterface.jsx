import React, { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer.jsx';
import { geminiService } from '../services/geminiService.js';
import {
  MessageRole, // Now a JS object
  controlLightFunctionDeclaration, // Now a JS object
} from '../types.js';
import FileUpload from './FileUpload.jsx';
import AudioRecorder from './AudioRecorder.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import {
  GEMINI_2_5_FLASH,
  GEMINI_2_5_PRO,
  GEMINI_2_5_FLASH_IMAGE,
  JPEG_QUALITY,
  ICON_SPARK,
  ICON_MIC,
  ICON_STOP,
} from './constants.jsx';

// Utility to convert ArrayBuffer to base64
async function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result?.toString().split(',')[1] || '');
    };
    reader.readAsDataURL(blob);
  });
}

// Utility to convert Blob to base64
async function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result?.toString().split(',')[1] || '');
    };
    reader.readAsDataURL(blob);
  });
}

const CHAT_HISTORY_KEY = 'alSadrAiChatHistory';

const ChatInterface = () => {
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
          // Remove any lingering 'isThinking' states from a previous session
          return parsedMessages.map(msg => ({ ...msg, isThinking: false }));
        }
      }
    } catch (error) {
      console.error('Failed to load messages from localStorage', error);
    }
    return []; // Default to empty array
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('ar'); // Add language state
  const [aiConfig, setAiConfig] = useState({
    model: GEMINI_2_5_FLASH,
    useThinkingBudget: false,
    useGoogleSearch: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLiveAudioMode, setIsLiveAudioMode] = useState(false);
  const [audioTranscription, setAudioTranscription] = useState(null); // For real-time, in-progress transcription
  const [clearFileInput, setClearFileInput] = useState(false);
  const [clearAudioInput, setClearAudioInput] = useState(false);
  const messagesEndRef = useRef(null);
  const frameIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, audioTranscription]);

  useEffect(() => {
    try {
      // Persist messages to localStorage, excluding transient properties like isThinking
      const messagesToSave = messages.map(
        ({ id, role, text, groundingUrls }) => ({ id, role, text, groundingUrls })
      );
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Failed to save messages to localStorage', error);
    }
  }, [messages]);

  useEffect(() => {
    if (clearFileInput) {
      setClearFileInput(false);
    }
    if (clearAudioInput) {
      setClearAudioInput(false);
    }
  }, [clearFileInput, clearAudioInput]);

  const addMessage = useCallback(
    (message) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), ...message },
      ]);
    },
    [],
  );

  const updateLastMessage = useCallback(
    (updater) => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage) {
          return [...prev.slice(0, -1), updater(lastMessage)];
        }
        return prev;
      });
    },
    [],
  );

  const handleFunctionCall = useCallback(
    async (functionCall) => {
      addMessage({
        role: MessageRole.INFO,
        text: `AI is requesting to call a function: \`${functionCall.name}\` with args: ${JSON.stringify(functionCall.args)}`,
      });
      if (functionCall.name === controlLightFunctionDeclaration.name) {
        const { brightness, colorTemperature } = functionCall.args;
        console.log(
          `MOCK: Setting light to brightness ${brightness} and color temperature ${colorTemperature}`,
        );
        return {
          id: functionCall.id,
          name: functionCall.name,
          response: { result: `Light set to brightness ${brightness}, color ${colorTemperature}` },
        };
      }
      return {
        id: functionCall.id,
        name: functionCall.name,
        response: { result: 'Function not implemented.' },
      };
    },
    [addMessage],
  );

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMessage = { role: MessageRole.USER, text: input };
    addMessage(userMessage);

    const aiMessagePlaceholder = { role: MessageRole.MODEL, text: '', isThinking: true };
    addMessage(aiMessagePlaceholder);


    setIsLoading(true);
    setInput('');
    if (selectedFile) {
        setClearFileInput(true);
        setSelectedFile(null);
    }

    try {
      let finalAiText = '';
      let groundingUrls;
      let functionCalls;
      
      let initialContents = [];
      if (selectedFile && selectedFile.file.type.startsWith('image/')) {
        initialContents.push({
          inlineData: {
            data: selectedFile.base64,
            mimeType: selectedFile.mimeType,
          },
        });
      }

      const [streamedGroundingUrls, streamedFunctionCalls] = await geminiService.generateContentStream(
        aiConfig.model,
        input,
        aiConfig.useThinkingBudget,
        aiConfig.useGoogleSearch,
        (currentText) => {
          finalAiText = currentText;
          updateLastMessage((prev) => ({ ...prev, text: currentText, isThinking: true }));
        },
        language // Pass language state
      );
      groundingUrls = streamedGroundingUrls;
      functionCalls = streamedFunctionCalls;
      
      updateLastMessage((prev) => ({
        ...prev,
        groundingUrls: groundingUrls,
        isThinking: false,
      }));

      if (functionCalls && functionCalls.length > 0) {
        addMessage({
          role: MessageRole.INFO,
          text: `AI initiated function calls: ${JSON.stringify(functionCalls.map(fc => fc.name))}. Responses will be integrated.`,
        });
      }

    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
        if (error.message.includes('API key error')) {
          errorMessage += ' Please reload and try again after selecting the API key.';
        }
      }
      updateLastMessage((prev) => ({
        ...prev,
        text: errorMessage,
        role: MessageRole.INFO,
        isThinking: false,
      }));
    } finally {
      setIsLoading(false);
      setClearFileInput(true); // Ensure file input is cleared after sending
      setSelectedFile(null);
    }
  };

  const handleAudioData = (pcmData) => {
    if (geminiService.getIsLiveSessionReady()) {
      geminiService.sendRealtimeAudio(pcmData);
    }
  };

  const handleStopAudioRecording = () => {
    setIsLiveAudioMode(false);
    setClearAudioInput(true);
    geminiService.stopLiveSession();
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setAudioTranscription(null);
  };

  const handleLiveTurnComplete = useCallback((inputTrans, outputTrans) => {
    setAudioTranscription((prev) => ({
      input: inputTrans,
      output: outputTrans,
      integrating: true,
    }));

    setTimeout(() => {
      if (inputTrans.trim()) {
        addMessage({ role: MessageRole.USER, text: `(Voice Input): ${inputTrans}` });
      }
      if (outputTrans.trim()) {
        addMessage({ role: MessageRole.MODEL, text: `${outputTrans}` });
      }
      setAudioTranscription(null);
    }, 1200);
  }, [addMessage]);


  const handleStartLiveAudio = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setIsLiveAudioMode(true);
    setAudioTranscription({ input: '', output: '', integrating: false });
    setClearFileInput(true);

    try {
      await geminiService.startLiveSession(
        (inputTrans, outputTrans) => {
          setAudioTranscription((prev) => ({
            input: inputTrans,
            output: outputTrans,
            integrating: prev?.integrating || false,
          }));
        },
        (audioBuffer) => {},
        (error) => {
          addMessage({
            role: MessageRole.INFO,
            text: `Live session error: ${error.message}.`,
          });
          setIsLoading(false);
          setIsLiveAudioMode(false);
        },
        (event) => {
          addMessage({ role: MessageRole.INFO, text: 'Live session ended.' });
          setIsLoading(false);
          setIsLiveAudioMode(false);
        },
        handleFunctionCall,
        () => {
          addMessage({ role: MessageRole.INFO, text: 'Live session started. You can now speak.' });
          setIsLoading(false);
        },
        handleLiveTurnComplete,
        language // Pass language state
      );
    } catch (error) {
      let errorMessage = 'Failed to start live session.';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      addMessage({ role: MessageRole.INFO, text: errorMessage });
      setIsLoading(false);
      setIsLiveAudioMode(false);
    }
  };

  const handleFileChange = (base64, mimeType, file) => {
    setSelectedFile({ base64, mimeType, file });
    setInput(file.name);
  };

  const handleClearChat = () => {
    setMessages([]);
    setAudioTranscription(null);
    if (isLiveAudioMode) {
      handleStopAudioRecording();
    }
    setClearFileInput(true);
    setClearAudioInput(true);
    try {
      localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage', error);
    }
  };
  
  const handleModelChange = (e) => {
    const newModel = e.target.value;
    const newConfig = { ...aiConfig, model: newModel };
    // If switching away from Pro, disable thinking budget
    if (newModel !== GEMINI_2_5_PRO) {
        newConfig.useThinkingBudget = false;
    }
    setAiConfig(newConfig);
  };

  const currentModelName = aiConfig.model.includes('flash')
    ? 'Gemini Flash'
    : 'Gemini Pro';
  const currentModelType = aiConfig.useThinkingBudget ? 'Thinking Mode' : 'Fast Responses';
  const currentSearchMode = aiConfig.useGoogleSearch ? 'Google Search' : 'Internal Knowledge';

  return (
    React.createElement(
      'div',
      { className: 'flex flex-col h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-50' },
      // Header
      React.createElement(
        'header',
        { className: 'flex-shrink-0 bg-white dark:bg-slate-800 p-4 shadow-md flex items-center justify-between z-10 border-b border-slate-200 dark:border-slate-700' },
        React.createElement(
          'div',
          { className: 'flex items-center space-x-3' },
          React.createElement('div', { className: 'w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-blue-400 flex items-center justify-center text-white' }, ICON_SPARK),
          React.createElement('h1', { className: 'text-xl font-bold text-slate-800 dark:text-slate-100' }, 'The Al-Sadr Legacy AI')
        ),
        React.createElement(
          'button',
          {
            onClick: handleClearChat,
            className: 'px-4 py-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 text-sm font-medium',
          },
          'Clear Chat'
        )
      ),

      // Messages Area
      React.createElement(
        'div',
        { className: 'flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar' },
        messages.length === 0 &&
          React.createElement(
            'div',
            { className: 'flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400' },
              React.createElement('div', { className: 'w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-blue-400 flex items-center justify-center text-white mb-6' }, 
                React.cloneElement(ICON_SPARK, { className: 'w-8 h-8' })
              ),
            React.createElement(
              'p',
              { className: 'text-xl font-semibold' },
              'Welcome! Explore the wisdom of Sayyid Al-Sadr.'
            ),
            React.createElement(
              'p',
              { className: 'text-md mt-2' },
              'Ask anything about his life, works, or jurisprudence.'
            ),
            React.createElement(
              'div',
              { className: 'mt-8 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700/50 text-sm max-w-lg w-full text-center' },
              React.createElement('p', { className: 'font-semibold mb-3 text-lg text-slate-700 dark:text-slate-300' }, 'Current AI Settings:'),
              React.createElement(
                'ul',
                { className: 'list-none space-y-2 text-left mx-auto max-w-xs' },
                React.createElement('li', {className: 'flex items-center'}, React.createElement('span', {className: 'text-blue-500 mr-2'}, '►'), 'Model: ', React.createElement('span', { className: 'font-medium text-slate-800 dark:text-slate-100 ml-1' }, currentModelName)),
                React.createElement('li', {className: 'flex items-center'}, React.createElement('span', {className: 'text-blue-500 mr-2'}, '►'), 'Response Style: ', React.createElement('span', { className: 'font-medium text-slate-800 dark:text-slate-100 ml-1' }, currentModelType)),
                React.createElement('li', {className: 'flex items-center'}, React.createElement('span', {className: 'text-blue-500 mr-2'}, '►'), 'Data Source: ', React.createElement('span', { className: 'font-medium text-slate-800 dark:text-slate-100 ml-1' }, currentSearchMode))
              )
            )
          ),
        messages.map((msg) =>
          React.createElement(
            'div',
            {
              key: msg.id,
              className: `flex items-start gap-3 ${msg.role === MessageRole.USER ? 'flex-row-reverse' : 'flex-row'} ${msg.role === MessageRole.INFO ? 'justify-center' : ''}`,
            },
            msg.role !== MessageRole.INFO && React.createElement('div', {className: `w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${msg.role === MessageRole.USER ? 'bg-slate-400' : 'bg-blue-500'}`}, msg.role === MessageRole.USER ? 'U' : 'AI'),
            React.createElement(
              'div',
              {
                className: `max-w-[80%] p-4 rounded-2xl shadow-md transition-all duration-300 ease-in-out
                ${
                  msg.role === MessageRole.USER
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : msg.role === MessageRole.MODEL
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 italic text-center text-sm'
                }`,
              },
              msg.image &&
                React.createElement('img', {
                  src: `data:${msg.image.startsWith('/') ? 'image/jpeg' : 'image/png'};base64,${msg.image}`,
                  alt: 'User uploaded',
                  className: 'max-w-full h-auto rounded-lg mb-2',
                }),
              msg.isThinking ? React.createElement(LoadingSpinner, null) : React.createElement(MarkdownRenderer, { content: msg.text }),
              msg.groundingUrls && msg.groundingUrls.length > 0 &&
                React.createElement(
                  'div',
                  { className: 'mt-4 pt-3 border-t border-slate-300/50 dark:border-slate-600/50 text-xs' },
                  React.createElement('p', { className: 'font-semibold mb-1' }, 'Sources:'),
                  React.createElement(
                    'ul',
                    { className: 'list-disc list-inside space-y-1' },
                    msg.groundingUrls.map((url, urlIndex) =>
                      React.createElement(
                        'li',
                        { key: urlIndex },
                        React.createElement(
                          'a',
                          {
                            href: url.uri,
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            className: 'text-blue-600 dark:text-blue-400 hover:underline',
                          },
                          url.title || url.uri
                        )
                      )
                    )
                  )
                )
            )
          )
        ),
        audioTranscription &&
          React.createElement(
            'div',
            { className: `p-4 rounded-xl shadow-md text-sm mt-4 border ${audioTranscription.integrating ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 italic border-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}` },
            React.createElement('p', { className: 'font-semibold text-blue-600 dark:text-blue-400' }, 'User (Live Input):'),
            React.createElement('p', null, audioTranscription.input || '...'),
            React.createElement('p', { className: 'font-semibold mt-2 text-blue-600 dark:text-blue-400' }, 'AI (Live Response):'),
            React.createElement('p', null, audioTranscription.output || '...'),
            audioTranscription.integrating && React.createElement('p', { className: 'mt-3 text-center text-slate-500 dark:text-slate-400 font-medium' }, 'Integrating into chat history...')
          ),
        React.createElement('div', { ref: messagesEndRef })
      ),

      // Input and Controls Area
      React.createElement(
        'div',
        { className: 'sticky bottom-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 flex flex-col items-center flex-shrink-0 border-t border-slate-200 dark:border-slate-700' },
        React.createElement(
          'div',
          { className: 'w-full max-w-4xl flex flex-col space-y-3' },
          // Model and Settings Selection
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-2 justify-center text-xs p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg' },
            React.createElement(
              'select',
              {
                value: aiConfig.model,
                onChange: handleModelChange,
                className: 'p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm',
                disabled: isLoading || isLiveAudioMode,
              },
              React.createElement('option', { value: GEMINI_2_5_FLASH }, 'Gemini Flash'),
              React.createElement('option', { value: GEMINI_2_5_PRO }, 'Gemini Pro')
            ),

            React.createElement(
              'select',
              {
                value: language,
                onChange: (e) => setLanguage(e.target.value),
                className: 'p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm',
                disabled: isLoading || isLiveAudioMode,
              },
              React.createElement('option', { value: 'ar' }, 'العربية'),
              React.createElement('option', { value: 'en' }, 'English')
            ),

            React.createElement(
              'label',
              { className: `flex items-center space-x-2 p-2 rounded-md border shadow-sm ${aiConfig.model === GEMINI_2_5_PRO ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-60 cursor-not-allowed'} text-slate-900 dark:text-slate-100 transition-all duration-200` },
              React.createElement('input', {
                type: 'checkbox',
                checked: aiConfig.useThinkingBudget && aiConfig.model === GEMINI_2_5_PRO,
                onChange: (e) =>
                  setAiConfig({
                    ...aiConfig,
                    useThinkingBudget: e.target.checked,
                  }),
                disabled: isLoading || isLiveAudioMode || aiConfig.model !== GEMINI_2_5_PRO,
                className: `form-checkbox h-4 w-4 rounded ${aiConfig.model === GEMINI_2_5_PRO ? 'text-blue-600 dark:text-blue-400 focus:ring-blue-500' : 'text-slate-400 cursor-not-allowed'}`,
              }),
              React.createElement('span', null, 'Think More')
            ),

            React.createElement(
              'label',
              { className: 'flex items-center space-x-2 p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm transition-all duration-200' },
              React.createElement('input', {
                type: 'checkbox',
                checked: aiConfig.useGoogleSearch,
                onChange: (e) =>
                  setAiConfig({ ...aiConfig, useGoogleSearch: e.target.checked }),
                disabled: isLoading || isLiveAudioMode,
                className: 'form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500',
              }),
              React.createElement('span', null, 'Search')
            )
          ),

          // Text Input and Action Buttons
          React.createElement(
            'div',
            { className: 'flex items-center space-x-2 w-full' },
              React.createElement(FileUpload, {
                onFileChange: handleFileChange,
                isLoading: isLoading || isLiveAudioMode,
                clearFile: clearFileInput,
              }),
            React.createElement('input', {
              type: 'text',
              value: input,
              onChange: (e) => setInput(e.target.value),
              onKeyPress: (e) => e.key === 'Enter' && sendMessage(),
              placeholder: isLiveAudioMode ? 'Live audio is active...' : 'Ask a question or describe your upload...',
              className: 'flex-grow px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm',
              disabled: isLoading || isLiveAudioMode,
            }),
            !isLiveAudioMode && React.createElement(
              'button',
              {
                onClick: handleStartLiveAudio,
                className: `p-2 rounded-full transition-colors duration-200 shadow-sm ${isLoading ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`,
                disabled: isLoading,
                title: 'Start Live Chat'
              },
              React.cloneElement(ICON_MIC, { className: 'w-6 h-6' })
            ),
             isLiveAudioMode && React.createElement(
              'button',
              {
                onClick: handleStopAudioRecording,
                className: 'p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-sm animate-pulse',
                title: 'Stop Live Chat'
              },
              React.cloneElement(ICON_STOP, { className: 'w-6 h-6' })
            ),
            React.createElement(
              'button',
              {
                onClick: sendMessage,
                className: `px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md ${isLoading || isLiveAudioMode || (!input.trim() && !selectedFile) ? 'opacity-50 cursor-not-allowed' : ''}`,
                disabled: isLoading || isLiveAudioMode || (!input.trim() && !selectedFile),
              },
              'Send'
            )
          )
        )
      )
    )
  );
};

export default ChatInterface;
