import React from 'react';

// Gemini Model Names
export const GEMINI_FLASH_LATEST = 'gemini-flash-latest';
export const GEMINI_2_5_FLASH = 'gemini-2.5-flash';
export const GEMINI_2_5_PRO = 'gemini-2.5-pro';
export const GEMINI_2_5_FLASH_IMAGE = 'gemini-2.5-flash-image';
export const GEMINI_2_5_FLASH_NATIVE_AUDIO =
  'gemini-2.5-flash-native-audio-preview-09-2025';

// AI Thinking Budget
export const THINKING_BUDGET_PRO = 32768; // Max for 2.5 Pro
export const THINKING_BUDGET_FLASH = 24576; // Max for 2.5 Flash

// UI Constants
export const JPEG_QUALITY = 0.7; // JPEG quality for image streaming (0.0 to 1.0)
export const FRAME_RATE = 5; // Frames per second for video analysis (lower for less resource usage)

// Default system instruction for the Al-Sadr Legacy AI
export const AL_SADR_SYSTEM_INSTRUCTION_AR = `
You are an AI assistant specialized in the life, works, and jurisprudence of Sayyid Muhammad Muhammad Sadiq al-Sadr.
Your responses MUST be based ONLY on the corpus of Al-Sadr's published works and authenticated biographical data.
When providing information, aim for accuracy and clarity, suitable for students and general users.
Provide analytical insights into his works and interpretive explanations of complex jurisprudential or philosophical concepts.
If asked to summarize or explain, provide concise and pedagogical explanations.

A critical requirement is that you must automatically cite your sources for every piece of information presented.
Citations should link back to specific works of Sayyid Al-Sadr.
Use the following clear and consistent citation format within your response:
[Citation: Book Title, Volume, Page Number]
For example: [Citation: Mā Warā’ al-Fiqh, Vol. 2, p. 45]
Include direct textual quotations where appropriate, followed by their citation.

When using Google Search for external information, you must still extract and list the URLs from the grounding chunks to provide sources for that external data.
Maintain a respectful and academic tone.
Your response must be in high-quality, formal Arabic.
`;

export const AL_SADR_SYSTEM_INSTRUCTION_EN = `
You are an AI assistant specialized in the life, works, and jurisprudence of Sayyid Muhammad Muhammad Sadiq al-Sadr.
Your responses MUST be based ONLY on the corpus of Al-Sadr's published works and authenticated biographical data.
When providing information, aim for accuracy and clarity, suitable for students and general users.
Provide analytical insights into his works and interpretive explanations of complex jurisprudential or philosophical concepts.
If asked to summarize or explain, provide concise and pedagogical explanations.

A critical requirement is that you must automatically cite your sources for every piece of information presented.
Citations should link back to specific works of Sayyid Al-Sadr.
Use the following clear and consistent citation format within your response:
[Citation: Book Title, Volume, Page Number]
For example: [Citation: Mā Warā’ al-Fiqh, Vol. 2, p. 45]
Include direct textual quotations where appropriate, followed by their citation.

When using Google Search for external information, you must still extract and list the URLs from the grounding chunks to provide sources for that external data.
Maintain a respectful and academic tone.
Respond in English.
`;

export const ICON_SPARK = React.createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: 'w-5 h-5',
  },
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M9.345 3.053A8.293 8.293 0 0 1 12 2.25c2.28 0 4.43.834 6.028 2.226.299.26.499.61.499 1.002A.75.75 0 0 1 18 6.75h-.083a8.281 8.281 0 0 0-6.738 3.499 4.279 4.279 0 0 0-1.071 5.378.75.75 0 0 1-1.001.402 11.233 11.233 0 0 0-.632-1.638 7.464 7.464 0 0 1-1.988 2.083.75.75 0 0 1-1.06-1.06 6 6 0 0 0 1.638-1.782A.75.75 0 0 1 7.5 13.5h-.083c-2.922 0-5.668-1.25-7.617-3.32a.75.75 0 0 1 .933-1.116 6.745 6.745 0 0 0 6.002 3.32H7.5A.75.75 0 0 1 8 12.75V8.57a.75.75 0 0 1 .345-.632Z',
    clipRule: 'evenodd',
  }),
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M11.54 22.132a.75.75 0 0 1-.767-.98l1.78-5.32a.75.75 0 0 1 .74-.567h2.923a.75.75 0 0 1 .723.513l2.25 6.75a.75.75 0 0 1-1.45 1.008l-1.925-5.772h-1.554l.732 2.193a.75.75 0 0 1-.723.977H11.54Z',
    clipRule: 'evenodd',
  })
);

export const ICON_MIC = React.createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: 'w-5 h-5',
  },
  React.createElement('path', {
    d: 'M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z',
  }),
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M5.25 9.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75V9.75Z',
    clipRule: 'evenodd',
  }),
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M16.5 9.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V9.75Z',
    clipRule: 'evenodd',
  }),
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M12 18a.75.75 0 0 1 .75.75V21h2.25a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1 0-1.5h2.25v-2.25a.75.75 0 0 1 .75-.75Z',
    clipRule: 'evenodd',
  })
);

export const ICON_UPLOAD = React.createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: 'w-5 h-5',
  },
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M11.47 2.47a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06L12 4.81V19.5a.75.75 0 0 1-1.5 0V4.81L8.78 7.28a.75.75 0 0 1-1.06-1.06l3.75-3.75Z',
    clipRule: 'evenodd',
  })
);

export const ICON_STOP = React.createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: 'w-5 h-5',
  },
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M6.75 5.25A.75.75 0 0 1 7.5 4.5h9a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75h-9a.75.75 0 0 1-.75-.75v-9Z',
    clipRule: 'evenodd',
  })
);

export const ICON_PLAY = React.createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: 'w-5 h-5',
  },
  React.createElement('path', {
    fillRule: 'evenodd',
    d: 'M4.5 5.653c0-1.427 1.529-2.32 2.792-1.664l11.549 6.223c1.264.682 1.264 2.643 0 3.325L7.292 20.311c-1.263.655-2.792-.231-2.792-1.664V5.653Z',
    clipRule: 'evenodd',
  })
);