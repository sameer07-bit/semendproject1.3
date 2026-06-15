import { useRef, useState, useEffect } from 'react';

function SketchPad({ onInsert, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil'); // 'pencil', 'pen', 'eraser'
  const [color, setColor] = useState('#5c3e35'); // standard warm wood/ink color
  const [lineWidth, setLineWidth] = useState(3);
  
  // Set up canvas default settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Fill canvas background with white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Support mouse or touch events
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = lineWidth;
    
    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lineWidth * 3; // make eraser wider
    } else if (tool === 'pencil') {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, lineWidth - 1); // pencil is thinner & pencil grey/colored
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth + 2; // pen brush is thicker
    }
    
    setIsDrawing(true);
    // Draw a single dot on click
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // prevent scrolling on touch devices
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Get Base64 image
    const dataUrl = canvas.toDataURL('image/png');
    if (onInsert) {
      onInsert(dataUrl);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>🖋️ Virtual Sketchpad (Pencil & Pen)</h3>
          <button style={styles.closeX} onClick={onClose}>×</button>
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolGroup}>
            <button 
              onClick={() => setTool('pencil')} 
              style={{...styles.toolBtn, ...(tool === 'pencil' ? styles.toolBtnActive : {})}}
            >
              ✏️ Pencil
            </button>
            <button 
              onClick={() => setTool('pen')} 
              style={{...styles.toolBtn, ...(tool === 'pen' ? styles.toolBtnActive : {})}}
            >
              🖋️ Pen Brush
            </button>
            <button 
              onClick={() => setTool('eraser')} 
              style={{...styles.toolBtn, ...(tool === 'eraser' ? styles.toolBtnActive : {})}}
            >
              🧹 Eraser
            </button>
          </div>

          <div style={styles.paramGroup}>
            <label style={styles.label}>Color:</label>
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)} 
              disabled={tool === 'eraser'}
              style={styles.colorInput}
            />

            <label style={styles.label}>Size ({lineWidth}px):</label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={lineWidth} 
              onChange={(e) => setLineWidth(Number(e.target.value))}
              style={styles.rangeInput}
            />
          </div>
        </div>

        {/* Drawing Canvas */}
        <div style={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            width={600}
            height={350}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={styles.canvas}
          />
        </div>

        {/* Footer actions */}
        <div style={styles.footer}>
          <button onClick={clearCanvas} style={styles.clearBtn}>Clear Board</button>
          <div style={styles.footerRight}>
            <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button onClick={handleInsert} style={styles.insertBtn}>Insert Sketch Into Document</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'var(--color-bg-card, #fcfaf7)',
    borderRadius: '16px',
    padding: '24px',
    width: '660px',
    maxWidth: '90%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    border: '1px solid var(--color-wood-dark, #5c3e35)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Outfit", sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--color-wood-dark, #5c3e35)',
  },
  closeX: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#aaa',
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(92, 62, 53, 0.05)',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  toolGroup: {
    display: 'flex',
    gap: '8px',
  },
  toolBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(92,62,53,0.2)',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  toolBtnActive: {
    backgroundColor: 'var(--color-forest-green, #2d5a27)',
    color: '#fff',
    borderColor: 'var(--color-forest-green, #2d5a27)',
  },
  paramGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    color: 'var(--color-wood-dark, #5c3e35)',
  },
  colorInput: {
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  rangeInput: {
    accentColor: 'var(--color-forest-green, #2d5a27)',
    width: '100px',
  },
  canvasWrapper: {
    border: '2px solid rgba(92, 62, 53, 0.15)',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  canvas: {
    cursor: 'crosshair',
    display: 'block',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRight: {
    display: 'flex',
    gap: '12px',
  },
  clearBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#c0392b',
    border: '1px solid #c0392b',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  insertBtn: {
    padding: '8px 20px',
    backgroundColor: 'var(--color-forest-green, #2d5a27)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  }
};

export default SketchPad;
