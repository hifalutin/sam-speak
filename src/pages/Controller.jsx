import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { loadFromFirestore, listenToFirestore, saveToFirestore } from '../lib/firebase';
import './Controller.css';

const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#16a085'];
const PADS_PER_PAGE = 6;

function Controller() {
  const [pads, setPads] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartTime = useRef(0);
  const pressTimer = useRef(null);

  useEffect(() => {
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('Service Worker registered');
      }).catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }

    // Load saved text from Firestore
    loadFromFirestore().then(data => {
      if (data) {
        setPads(data);
      } else {
        // Load from localStorage fallback
        const localPads = {};
        for (let i = 0; i < 6; i++) {
          const text = localStorage.getItem(`rectangle-${i}`);
          if (text) {
            localPads[i] = text;
          }
        }
        setPads(localPads);
      }
    });

    // Listen for real-time updates
    const unsubscribe = listenToFirestore((data) => {
      if (data) {
        setPads(data);
        // Save to localStorage
        Object.entries(data).forEach(([index, text]) => {
          localStorage.setItem(`rectangle-${index}`, text);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const speakWithWebAPI = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    const voices = synth.getVoices();
    const maleVoice = voices.find(voice =>
      voice.lang.startsWith('en') && (
        voice.name.includes('Male') ||
        voice.name.includes('David') ||
        voice.name.includes('Fred')
      )
    );

    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    synth.speak(utterance);
  };

  const speakNumber = async (text) => {
    if (!navigator.onLine) {
      console.log('Offline - using Web Speech API');
      speakWithWebAPI(text);
      return;
    }

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Failed to get speech');
      }

      const data = await response.json();

      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();

      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('Google TTS failed, using Web Speech API:', error);
      speakWithWebAPI(text);
    }
  };

  const handleClick = (index) => {
    const text = pads[index];
    const textToSpeak = text || String(index + 1);
    speakNumber(textToSpeak);
  };

  const handlePressStart = (index) => {
    pressTimer.current = setTimeout(() => {
      setEditingIndex(index);
      setEditText(pads[index] || '');
    }, 500); // 500ms hold to edit
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleEditSave = async () => {
    if (editingIndex === null) return;

    const newPads = { ...pads, [editingIndex]: editText };
    setPads(newPads);
    await saveToFirestore(newPads);

    setEditingIndex(null);
    setEditText('');
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleEditDelete = async () => {
    if (editingIndex === null) return;

    const newPads = { ...pads };
    delete newPads[editingIndex];
    setPads(newPads);
    await saveToFirestore(newPads);

    setEditingIndex(null);
    setEditText('');
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 55;
    const maxTapDuration = 150; // milliseconds
    const diff = touchStartX.current - touchEndX.current;
    const duration = Date.now() - touchStartTime.current;

    // Treat as tap if very quick AND very little movement
    const isTap = duration < maxTapDuration && Math.abs(diff) < swipeThreshold;

    // Only swipe if it's not a tap
    if (!isTap) {
      if (diff > 0) {
        // Swipe left - next page
        setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
      } else {
        // Swipe right - previous page
        setCurrentPage(prev => Math.max(prev - 1, 0));
      }
    }
  };

  // Calculate total pads and pages
  const maxIndex = Object.keys(pads).length > 0
    ? Math.max(...Object.keys(pads).map(Number))
    : -1;
  const totalPads = Math.max(PADS_PER_PAGE, maxIndex + 1);
  const totalPages = Math.ceil(totalPads / PADS_PER_PAGE);

  // Get pads for current page
  const startIndex = currentPage * PADS_PER_PAGE;
  const endIndex = startIndex + PADS_PER_PAGE;
  const currentPageIndices = Array.from({ length: PADS_PER_PAGE }, (_, i) => startIndex + i);

  // Count actual pads with content on current page
  const actualPadsOnPage = currentPageIndices.filter(i => pads[i] !== undefined && pads[i] !== '').length;
  const padsToShow = actualPadsOnPage > 0 ? actualPadsOnPage : (maxIndex < 0 ? 6 : 0);

  // Determine grid layout based on number of pads
  let gridClass = 'grid';
  if (padsToShow === 1) gridClass = 'grid-1';
  else if (padsToShow === 2) gridClass = 'grid-2';
  else if (padsToShow === 3) gridClass = 'grid-3';
  else if (padsToShow === 4) gridClass = 'grid-4';
  else if (padsToShow === 5) gridClass = 'grid-5';
  else gridClass = 'grid';

  return (
    <div
      className="controller-page"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Link to="/" className="floating-back-button">← Back</Link>
      <div className={gridClass}>
        {currentPageIndices
          .filter(i => padsToShow === 6 || (pads[i] !== undefined && pads[i] !== ''))
          .map(i => (
            <div
              key={i}
              className="rectangle"
              style={{ backgroundColor: colors[i % colors.length] }}
              onClick={() => handleClick(i)}
              onMouseDown={() => handlePressStart(i)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={(e) => {
                e.stopPropagation();
                handlePressStart(i);
              }}
              onTouchEnd={handlePressEnd}
            >
              {pads[i] || String(i + 1)}
            </div>
          ))}
      </div>
      {totalPages > 1 && (
        <div className="page-indicators">
          {Array.from({ length: totalPages }, (_, i) => (
            <div
              key={i}
              className={`page-dot ${i === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(i)}
            />
          ))}
        </div>
      )}

      {editingIndex !== null && (
        <div className="edit-modal" onClick={handleEditCancel}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Pad {editingIndex + 1}</h2>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Enter text..."
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={handleEditDelete} className="delete-btn">Delete</button>
              <div className="button-spacer"></div>
              <button onClick={handleEditCancel} className="cancel-btn">Cancel</button>
              <button onClick={handleEditSave} className="save-btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Controller;
