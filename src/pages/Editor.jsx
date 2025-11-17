import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { saveToFirestore, loadFromFirestore, listenToFirestore } from '../lib/firebase';
import './Editor.css';

function Editor() {
  const [pads, setPads] = useState({});
  const [status, setStatus] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    // Load saved text from Firestore
    loadFromFirestore().then(data => {
      if (data) {
        setPads(data);
      } else {
        // Initialize with default 6 pads
        const defaultPads = {};
        for (let i = 0; i < 6; i++) {
          defaultPads[i] = localStorage.getItem(`rectangle-${i}`) || '';
        }
        setPads(defaultPads);
      }
    });

    // Listen for real-time updates
    const unsubscribe = listenToFirestore((data) => {
      if (data) {
        setPads(data);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = async (index, value) => {
    const newPads = { ...pads, [index]: value };
    setPads(newPads);

    const success = await saveToFirestore(newPads);
    setStatus(success ? '✓ Saved' : '✗ Save failed');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    // Create array of entries sorted by current index
    const entries = Object.entries(pads).sort((a, b) => Number(a[0]) - Number(b[0]));

    // Remove dragged item
    const [draggedEntry] = entries.splice(draggedIndex, 1);

    // Insert at new position
    entries.splice(dropIndex, 0, draggedEntry);

    // Rebuild pads object with new indices
    const newPads = {};
    entries.forEach(([_, value], idx) => {
      newPads[idx] = value;
    });

    setPads(newPads);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save to Firestore
    const success = await saveToFirestore(newPads);
    setStatus(success ? '✓ Reordered' : '✗ Reorder failed');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const addPad = async () => {
    const maxIndex = Object.keys(pads).length > 0
      ? Math.max(...Object.keys(pads).map(Number))
      : -1;
    const nextIndex = maxIndex + 1;

    const newPads = { ...pads, [nextIndex]: '' };
    setPads(newPads);

    const success = await saveToFirestore(newPads);
    setStatus(success ? '✓ Pad added' : '✗ Add failed');
    setTimeout(() => setStatus(''), 2000);
  };

  const deletePad = async (index) => {
    const newPads = { ...pads };
    delete newPads[index];
    setPads(newPads);

    const success = await saveToFirestore(newPads);
    setStatus(success ? '✓ Pad deleted' : '✗ Delete failed');
    setTimeout(() => setStatus(''), 2000);
  };

  const maxIndex = Object.keys(pads).length > 0
    ? Math.max(...Object.keys(pads).map(Number))
    : -1;
  const padCount = Math.max(6, maxIndex + 1);
  const padIndices = Array.from({ length: padCount }, (_, i) => i);

  return (
    <div className="editor-page">
      <div className="header">
        <h1>Pad Editor</h1>
        <div className="header-buttons">
          <Link to="/" className="back-button">← Back</Link>
          <Link to="/controller" className="controller-link">Voice Pads →</Link>
        </div>
      </div>
      <div className="editor-container">
        <div className="inputs-list">
          {padIndices.map(i => (
            <div
              key={i}
              className={`input-row ${dragOverIndex === i ? 'drag-over' : ''}`}
              onDragEnter={(e) => handleDragEnter(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
            >
              <div
                className="drag-handle"
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragEnd={handleDragEnd}
              >
                ☰
              </div>
              <label>Pad {i + 1}</label>
              <input
                type="text"
                value={pads[i] || ''}
                onChange={(e) => handleInputChange(i, e.target.value)}
                placeholder={`Enter text for pad ${i + 1}...`}
              />
              <button
                className="delete-button"
                onClick={() => deletePad(i)}
                aria-label="Delete pad"
              >
                ✕
              </button>
            </div>
          ))}
          <button className="add-button" onClick={addPad}>
            + Add Pad
          </button>
        </div>
      </div>
      {status && <div className={`status ${status.includes('✓') ? 'success' : 'error'}`}>{status}</div>}
    </div>
  );
}

export default Editor;
