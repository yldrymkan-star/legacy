import {
  GoogleGenAI,
  Modality,
} from '@google/genai';
import {
  controlLightFunctionDeclaration,
} from '../types.js';
import {
  AL_SADR_SYSTEM_INSTRUCTION,
  THINKING_BUDGET_PRO,
} from '../constants.jsx';

// Helper functions for audio encoding/decoding
function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data,
  ctx,
  sampleRate,
  numChannels,
) {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to create Blob for Live API
function createPcmBlob(data) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

class GeminiService {
  ai;
  sessionPromise = null;
  outputAudioContext = null;
  outputGainNode = null;
  audioSources = new Set();
  nextStartTime = 0;
  onMessageCallback = null;
  isLiveSessionReady = false;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // General content generation for text/image inputs
  async generateContent(
    model,
    prompt,
    imageParts = [],
    useThinkingBudget = false,
    useGoogleSearch = false,
    onFunctionCall,
  ) {
    // Re-initialize GoogleGenAI to ensure latest API key if selected via openSelectKey()
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contents = [...imageParts, { text: prompt }];

    const config = {
      systemInstruction: AL_SADR_SYSTEM_INSTRUCTION,
    };

    if (useThinkingBudget) {
      config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_PRO };
      // maxOutputTokens is intentionally not set here as per guidance.
    }

    const tools = [];
    if (useGoogleSearch) {
      tools.push({ googleSearch: {} });
    }
    if (onFunctionCall) {
      tools.push({ functionDeclarations: [controlLightFunctionDeclaration] });
    }

    if (tools.length > 0) {
      config.tools = tools;
    }

    try {
      const result = await this.ai.models.generateContent({
        model,
        contents: [{ parts: contents }],
        config,
      });

      const text = result.text;
      const groundingChunks =
        result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const functionCalls = result.functionCalls;

      let extractedGroundingUrls;
      if (groundingChunks && groundingChunks.length > 0) {
        extractedGroundingUrls = groundingChunks
          .map((chunk) => {
            if (chunk.web) {
              return { uri: chunk.web.uri, title: chunk.web.title };
            }
            if (chunk.maps) {
              return { uri: chunk.maps.uri, title: chunk.maps.title };
            }
            return undefined;
          })
          .filter((url) => url !== undefined);
      }

      let executedFunctionCalls;
      if (functionCalls && functionCalls.length > 0 && onFunctionCall) {
        executedFunctionCalls = [];
        for (const fc of functionCalls) {
          executedFunctionCalls.push(fc);
          const toolResponse = await onFunctionCall(fc);
          await this.ai.models.generateContent({
            model,
            contents: [{parts: contents}, {
              role: 'model',
              parts: [{
                functionCall: fc,
              }],
            }, {
              role: 'tool',
              parts: [{
                functionResponse: {
                  name: toolResponse.name,
                  response: toolResponse.response,
                },
              }],
            }],
            config,
          });
        }
      }

      return [text, extractedGroundingUrls, executedFunctionCalls];
    } catch (error) {
      console.error('Gemini API Error:', error);
      if (
        error instanceof Error &&
        error.message.includes('Requested entity was not found.') &&
        window.aistudio?.openSelectKey
      ) {
        alert(
          'API key might be invalid or not selected. Please select a valid API key.',
        );
        await window.aistudio.openSelectKey();
        throw new Error(
          'API key error. User prompted to select key. Please try again.',
        );
      }
      throw error;
    }
  }

  // Streaming content generation for text-only inputs
  async generateContentStream(
    model,
    prompt,
    useThinkingBudget = false,
    useGoogleSearch = false,
    onChunk,
  ) {
    // Re-initialize GoogleGenAI to ensure latest API key if selected via openSelectKey()
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const config = {
      systemInstruction: AL_SADR_SYSTEM_INSTRUCTION,
    };

    if (useThinkingBudget) {
      config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_PRO };
      // maxOutputTokens is intentionally not set here as per guidance.
    }

    const tools = [];
    if (useGoogleSearch) {
      tools.push({ googleSearch: {} });
    }

    if (tools.length > 0) {
      config.tools = tools;
    }

    try {
      const result = await this.ai.models.generateContentStream({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config,
      });

      let fullText = '';
      let extractedGroundingUrls;
      let functionCalls;

      for await (const chunk of result) {
        fullText += chunk.text;
        onChunk(fullText); // Pass cumulative text for streaming effect

        if (chunk.groundingMetadata?.groundingChunks) {
          extractedGroundingUrls = chunk.groundingMetadata.groundingChunks
            .map((gChunk) => {
              if (gChunk.web) {
                return { uri: gChunk.web.uri, title: gChunk.web.title };
              }
              if (gChunk.maps) {
                return { uri: gChunk.maps.uri, title: gChunk.maps.title };
              }
              return undefined;
            })
            .filter((url) => url !== undefined);
        }
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          functionCalls = (chunk.functionCalls);
        }
      }
      return [extractedGroundingUrls, functionCalls];
    } catch (error) {
      console.error('Gemini Streaming API Error:', error);
      if (
        error instanceof Error &&
        error.message.includes('Requested entity was not found.') &&
        window.aistudio?.openSelectKey
      ) {
        alert(
          'API key might be invalid or not selected. Please select a valid API key.',
        );
        await window.aistudio.openSelectKey();
        throw new Error(
          'API key error. User prompted to select key. Please try again.',
        );
      }
      throw error;
    }
  }

  // Live API for real-time audio conversation and transcription
  async startLiveSession(
    onTranscription, // Callback to update current live transcription
    onAudioOutput,    // Callback for audio playback visualization (not used for playback here)
    onError,          // Error callback
    onClose,          // Close callback
    onFunctionCall,   // Optional function call handler
    onSessionReady,   // Optional session ready callback
    onTurnComplete,   // NEW: Callback for when a full turn (input+output) is complete
  ) {
    // Re-initialize GoogleGenAI to ensure latest API key if selected via openSelectKey()
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Fix: Use standard AudioContext directly as webkitAudioContext is deprecated.
    this.outputAudioContext =
      this.outputAudioContext ||
      new AudioContext({
        sampleRate: 24000,
      });
    this.outputGainNode =
      this.outputGainNode || this.outputAudioContext.createGain();
    this.outputGainNode.connect(this.outputAudioContext.destination);

    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    const tools = [];
    if (onFunctionCall) {
      tools.push({ functionDeclarations: [controlLightFunctionDeclaration] });
    }

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log('Live session opened');
          this.isLiveSessionReady = true;
          onSessionReady?.();
          this.nextStartTime = 0; // Reset on session open
        },
        onmessage: async (message) => {
          // Handle transcriptions
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription +=
              message.serverContent.outputTranscription.text;
            onTranscription(currentInputTranscription, currentOutputTranscription); // Update real-time transcription
          }
          if (message.serverContent?.inputTranscription) {
            currentInputTranscription +=
              message.serverContent.inputTranscription.text;
            onTranscription(currentInputTranscription, currentOutputTranscription); // Update real-time transcription
          }
          if (message.serverContent?.turnComplete) {
            // NEW: Call the onTurnComplete callback to integrate into chat history
            if (onTurnComplete) {
                onTurnComplete(currentInputTranscription, currentOutputTranscription);
            }
            // IMPORTANT: internal transcriptions are now cleared after onTurnComplete is processed by ChatInterface
            currentInputTranscription = '';
            currentOutputTranscription = '';
          }

          // Handle function calls
          if (message.toolCall && onFunctionCall) {
            for (const fc of message.toolCall.functionCalls) {
              const toolResponse = await onFunctionCall(fc);
              this.sessionPromise?.then((session) => {
                session.sendToolResponse({
                  functionResponses: {
                    id: fc.id,
                    name: toolResponse.name,
                    response: toolResponse.response,
                  },
                });
              });
            }
          }

          // Handle audio output
          const base64EncodedAudioString =
            message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString && this.outputAudioContext) {
            this.nextStartTime = Math.max(
              this.nextStartTime,
              this.outputAudioContext.currentTime,
            );
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString),
              this.outputAudioContext,
              24000,
              1,
            );
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputGainNode);
            source.addEventListener('ended', () => {
              this.audioSources.delete(source);
            });
            source.start(this.nextStartTime);
            this.nextStartTime = this.nextStartTime + audioBuffer.duration;
            this.audioSources.add(source);
            onAudioOutput(audioBuffer); // Callback for visualizer or other uses
          }

          // Handle interruption
          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            for (const source of this.audioSources.values()) {
              source.stop();
              this.audioSources.delete(source);
            }
            this.nextStartTime = 0;
            console.log('Model interrupted output.');
          }
        },
        onerror: (e) => {
          console.error('Live session error:', e);
          onError(e);
          this.isLiveSessionReady = false;
        },
        onclose: (e) => {
          console.log('Live session closed:', e);
          onClose(e);
          this.isLiveSessionReady = false;
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: AL_SADR_SYSTEM_INSTRUCTION,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: tools.length > 0 ? tools : undefined,
      },
    });
  }

  async sendRealtimeAudio(pcmData) {
    if (!this.isLiveSessionReady) {
      console.warn('Live session not ready. Audio data not sent.');
      return;
    }
    this.sessionPromise?.then((session) => {
      session.sendRealtimeInput({ media: createPcmBlob(pcmData) });
    });
  }

  // Sends an image frame to the live session (for "video" input simulation)
  async sendRealtimeImage(base64ImageData, mimeType) {
    if (!this.isLiveSessionReady) {
      console.warn('Live session not ready. Image data not sent.');
      return;
    }
    this.sessionPromise?.then((session) => {
      session.sendRealtimeInput({
        media: { data: base64ImageData, mimeType },
      });
    });
  }

  stopLiveSession() {
    this.sessionPromise?.then((session) => {
      session.close();
    });
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
      this.outputGainNode = null;
    }
    this.audioSources.forEach((source) => source.stop());
    this.audioSources.clear();
    this.sessionPromise = null;
    this.isLiveSessionReady = false;
    this.nextStartTime = 0;
  }

  getIsLiveSessionReady() {
    return this.isLiveSessionReady;
  }

  async generateVideo(
    prompt,
    image,
    lastFrame,
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const request = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9',
      },
    };

    if (image) {
      request.image = {
        imageBytes: image.base64,
        mimeType: image.mimeType,
      };
    }

    if (lastFrame) {
      request.config.lastFrame = {
        imageBytes: lastFrame.base64,
        mimeType: lastFrame.mimeType,
      };
    }

    let operation = await this.ai.models.generateVideos(request);
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await this.ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error('No video URI found in the response.');
    }

    // Append API key for download
    const videoResponse = await fetch(
      `${downloadLink}&key=${process.env.API_KEY}`,
    );
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
  }
}

export const geminiService = new GeminiService();