import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const CHAT_FONT_SIZE_MAP = { small: '13px', medium: '15px', large: '17px' };
const savedChatFontSize = localStorage.getItem('chatFontSize') || 'medium';
document.documentElement.style.setProperty(
  '--chat-font-size',
  CHAT_FONT_SIZE_MAP[savedChatFontSize] || CHAT_FONT_SIZE_MAP.medium
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
