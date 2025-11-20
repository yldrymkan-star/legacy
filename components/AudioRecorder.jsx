import React, { useState, useRef, useEffect } from 'react';
import { ICON_MIC, ICON_STOP } from './constants.jsx'; // Corrected path to ./constants.jsx

const AudioRecorder = ({
  onAudioData,
  onStop,
  isLoading,
  clearAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (clearAudio) {
      stopRecording();
    }
  }, [clearAudio]);

  const startRecording = async () => {
    if (isLoading) return;
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // Fix: Use standard AudioContext directly as webkitAudioContext is deprecated.
      audioContextRef.current = new AudioContext({
        sampleRate: 16000, // Live API requires 16000 sample rate
      });
      const source = audioContextRef.current.createMediaStreamSource(
        streamRef.current,
      );

      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(
        4096, // Buffer size
        1, // Input channels
        1, // Output channels
      );

      scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        onAudioData(inputData);
      };

      source.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);

      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Error accessing microphone. Please check your permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    onStop();
  };

  return (
    React.createElement(
      'button',
      {
        onClick: isRecording ? stopRecording : startRecording,
        disabled: isLoading && !isRecording,
        className: `inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-md
        ${
          isLoading && !isRecording
            ? 'bg-stone-400 text-stone-700 cursor-not-allowed'
            : isRecording
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-amber-600 text-white hover:bg-amber-700'
        }
      `,
      },
      isRecording ? ICON_STOP : ICON_MIC,
      React.createElement(
        'span',
        { className: 'ml-2' },
        isRecording ? 'Stop Recording' : 'Record Audio'
      )
    )
  );
};

export default AudioRecorder;