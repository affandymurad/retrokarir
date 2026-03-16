import React from 'react';
import styles from './Navbar.module.css';

export default function Navbar({ isDark, onToggleDark, aiMode, onToggleAi, onHome }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <button className={styles.logo} onClick={onHome} title="Kembali ke halaman utama">
          <span className={styles.logoMark}>R</span>
          <span className={styles.logoText}>Retrokarir</span>
        </button>
        <div className={styles.controls}>
          <a href="https://affandymurad.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.aiToggle}
            style={{textDecoration: 'none'}}
          >
          👤 <span className={styles.portfolioText}>Affandy Murad</span>
          </a>
          {/* AI Mode Toggle */}
          <button className={styles.aiToggle} onClick={onToggleAi} title={`Mode: ${aiMode.toUpperCase()}`}>
            {aiMode === 'gemini' ? (
              <>
                <GeminiIcon />
                <span>Gemini</span>
              </>
            ) : (
              <>
                <OllamaIcon />
                <span>Ollama</span>
              </>
            )}
          </button>
          {/* Dark Mode Toggle */}
          <button className={styles.themeBtn} onClick={onToggleDark} aria-label="Toggle theme">
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </nav>
  );
}

function GeminiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 8 7 8 12C8 17 12 22 12 22C12 22 16 17 16 12C16 7 12 2 12 2Z" fill="#4285F4"/>
      <path d="M2 12C2 12 7 8 12 8C17 8 22 12 22 12C22 12 17 16 12 16C7 16 2 12 2 12Z" fill="#EA4335"/>
    </svg>
  );
}

function OllamaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="9" cy="10" r="2" fill="currentColor"/>
      <circle cx="15" cy="10" r="2" fill="currentColor"/>
      <path d="M9 15 Q12 18 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
