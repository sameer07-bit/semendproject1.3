import { useRef, useState, useEffect } from 'react';
import SketchPad from './SketchPad';
import { jsPDF } from 'jspdf';

// Dynamic load for Architects Daughter font from Google Fonts for "pencil" text styling
const loadHandwritingFont = () => {
  if (!document.getElementById('google-font-handwriting')) {
    const link = document.createElement('link');
    link.id = 'google-font-handwriting';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap';
    document.head.appendChild(link);
  }
};

function RichTextEditor({ value, onChange, title, placeholder }) {
  const editorRef = useRef(null);
  const [showSketchpad, setShowSketchpad] = useState(false);
  const [activeFont, setActiveFont] = useState('sans-serif');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    loadHandwritingFont();

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        
        if (editorRef.current) {
          editorRef.current.focus();
          // Insert the transcribed text exactly at the current cursor selection
          document.execCommand('insertText', false, (editorRef.current.innerText.trim() ? ' ' : '') + transcript);
          handleInput();
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e) => {
        console.error("Speech Recognition Error in Editor:", e);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleMicrophone = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Sync initial and loaded database content to contenteditable innerHTML
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Execute text commands via browser document.execCommand
  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const handleFontChange = (fontFamily) => {
    setActiveFont(fontFamily);
    execCmd('fontName', fontFamily);
  };

  const handleInsertSketch = (base64Data) => {
    setShowSketchpad(false);
    
    // Focus the editor container
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Generate inline HTML for image
    const imgHtml = `<img src="${base64Data}" alt="Sketch Drawing" style="max-width: 100%; height: auto; border: 1px solid rgba(92, 62, 53, 0.15); border-radius: 8px; margin: 12px 0; display: block;" />`;
    document.execCommand('insertHTML', false, imgHtml);
    handleInput();
  };

  // PDF Exporter supporting Rich Text paragraphs and Drawing Sketches
  const exportToPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const titleText = title || 'Untitled Manuscript';
    const authorText = `Written by: ${localStorage.getItem('userName') || 'Anonymous Author'}`;

    // PDF Style settings
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(92, 62, 53); // Wood dark accent color
    doc.text(titleText, 40, 60);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(authorText, 40, 80);

    // Decorative line separator
    doc.setLineWidth(1.5);
    doc.setDrawColor(92, 62, 53);
    doc.line(40, 92, pageWidth - 40, 92);

    let yOffset = 120;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);

    // Create a sandbox div to parse HTML nodes
    const sandbox = document.createElement('div');
    sandbox.innerHTML = value || '';

    const nodes = Array.from(sandbox.childNodes);

    for (let node of nodes) {
      if (node.nodeName === 'IMG') {
        const src = node.getAttribute('src');
        if (src && src.startsWith('data:image/')) {
          const imgWidth = 320;
          const imgHeight = 180;
          if (yOffset + imgHeight > pageHeight - 50) {
            doc.addPage();
            yOffset = 50;
          }
          try {
            doc.addImage(src, 'PNG', 40, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 24;
          } catch (e) {
            console.error('Failed to add image to PDF:', e);
          }
        }
      } else {
        // Text blocks
        const text = node.innerText || node.textContent;
        if (!text || !text.trim()) continue;

        const lines = doc.splitTextToSize(text, pageWidth - 80);
        for (let line of lines) {
          if (yOffset > pageHeight - 50) {
            doc.addPage();
            yOffset = 50;
          }
          doc.text(line, 40, yOffset);
          yOffset += 16;
        }
        yOffset += 8; // small spacer between sibling nodes
      }
    }

    doc.save(`${titleText.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`);
    alert('PDF generated successfully!');
  };

  return (
    <div style={editorStyles.container}>
      {/* Editor Formatting Actions Panel */}
      <div style={editorStyles.toolbar}>
        <button onClick={() => execCmd('bold')} style={editorStyles.btn} title="Bold">
          <strong>B</strong>
        </button>
        <button onClick={() => execCmd('italic')} style={editorStyles.btn} title="Italic">
          <em>I</em>
        </button>
        <button onClick={() => execCmd('underline')} style={editorStyles.btn} title="Underline">
          <u>U</u>
        </button>

        {/* Text color picker (Pen Option) */}
        <select 
          onChange={(e) => execCmd('foreColor', e.target.value)} 
          style={editorStyles.select}
          defaultValue=""
          title="Pen (Text Color)"
        >
          <option value="" disabled>🖋️ Pen Color</option>
          <option value="#2c3e50">Dark Charcoal</option>
          <option value="#2980b9">Classic Blue</option>
          <option value="#c0392b">Crimson Red</option>
          <option value="#27ae60">Forest Green</option>
          <option value="#8e44ad">Royal Purple</option>
        </select>

        {/* Highlighter brush */}
        <select 
          onChange={(e) => execCmd('backColor', e.target.value)} 
          style={editorStyles.select}
          defaultValue=""
          title="Highlight Pen"
        >
          <option value="" disabled>🖌️ Highlight</option>
          <option value="#f1c40f">Yellow Highlight</option>
          <option value="#2ecc71">Green Highlight</option>
          <option value="#9b59b6">Lavender Highlight</option>
          <option value="#e74c3c">Coral Highlight</option>
          <option value="transparent">Clear Brush</option>
        </select>

        {/* Font Style including cursive Pencil stack */}
        <select 
          value={activeFont}
          onChange={(e) => handleFontChange(e.target.value)} 
          style={editorStyles.select}
          title="Font Style"
        >
          <option value="sans-serif">Sans Serif</option>
          <option value="Georgia, serif">Serif Classic</option>
          <option value="Courier New, monospace">Monospace Typist</option>
          <option value="'Architects Daughter', cursive">✏️ Pencil Handwriting</option>
        </select>

        {/* Sketchpad overlay toggle */}
        <button 
          onClick={() => setShowSketchpad(true)} 
          style={{...editorStyles.btn, ...editorStyles.btnSketch}}
          title="Draw with Pen/Pencil Canvas"
        >
          🎨 Draw Sketch
        </button>

        {/* Dictate Speech-to-Text Microphone button */}
        <button 
          onClick={toggleMicrophone}
          className={isListening ? 'listening-pulse' : ''}
          style={{
            ...editorStyles.btn,
            backgroundColor: isListening ? 'var(--color-terracotta, #c0392b)' : '#f4f6f7',
            borderColor: isListening ? 'var(--color-terracotta, #c0392b)' : 'rgba(92, 62, 53, 0.15)',
            color: isListening ? '#fff' : '#555',
            fontWeight: '600'
          }}
          title={isListening ? "Stop Microphone" : "Dictate text using microphone"}
        >
          🎤 {isListening ? 'Listening...' : 'Mic to Text'}
        </button>

        {/* PDF Exporter */}
        <button 
          onClick={exportToPdf} 
          style={{...editorStyles.btn, ...editorStyles.btnPdf}}
          title="Export Manuscript to PDF"
        >
          📄 Export PDF
        </button>
      </div>

      {/* Editor Content Canvas area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        placeholder={placeholder || "Pour your thoughts onto the page..."}
        style={{
          ...editorStyles.editor,
          fontFamily: activeFont.includes('Architects Daughter') ? "'Architects Daughter', cursive" : activeFont
        }}
      />

      {/* Virtual Sketchboard Modal */}
      {showSketchpad && (
        <SketchPad 
          onInsert={handleInsertSketch} 
          onClose={() => setShowSketchpad(false)} 
        />
      )}
    </div>
  );
}

const editorStyles = {
  container: {
    border: '1px solid rgba(92, 62, 53, 0.2)',
    borderRadius: '8px',
    backgroundColor: '#fff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
  },
  toolbar: {
    padding: '8px',
    backgroundColor: 'rgba(92, 62, 53, 0.04)',
    borderBottom: '1px solid rgba(92, 62, 53, 0.12)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  btn: {
    padding: '6px 12px',
    border: '1px solid rgba(92, 62, 53, 0.15)',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    color: '#555',
  },
  btnSketch: {
    backgroundColor: '#ebf5fb',
    borderColor: '#aed6f1',
    color: '#2980b9',
  },
  btnPdf: {
    backgroundColor: '#fef9e7',
    borderColor: '#fdebd0',
    color: '#d35400',
    marginLeft: 'auto',
  },
  select: {
    padding: '5px 10px',
    border: '1px solid rgba(92, 62, 53, 0.15)',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
    color: '#555',
  },
  editor: {
    minHeight: '260px',
    maxHeight: '450px',
    overflowY: 'auto',
    padding: '16px',
    outline: 'none',
    lineHeight: '1.6',
    fontSize: '16px',
    color: '#2c3e50',
    backgroundColor: '#fff',
  }
};

export default RichTextEditor;
