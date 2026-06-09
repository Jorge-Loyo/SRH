/**
 * RichTextEditor — editor de texto enriquecido basado en contentEditable.
 * Props:
 *   value       : string (HTML)
 *   onChange    : (html: string) => void
 *   placeholder : string
 *   readOnly    : boolean
 *   minHeight   : number (px)
 *   className   : string (clase adicional en el wrapper)
 */
import { useRef, useEffect, useState, useCallback } from 'react';

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101
           m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Botón de barra ───────────────────────────────────────────────────────────

function ToolBtn({ active, onMouseDown, title, children, className: extra = '' }) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      className={[
        'w-7 h-7 rounded flex items-center justify-center text-sm transition-colors select-none',
        active
          ? 'bg-primary-600 text-white'
          : 'hover:bg-gray-200 text-gray-700',
        extra,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="inline-block w-px h-5 bg-gray-300 mx-1 self-center" />;
}

// ─── Editor principal ─────────────────────────────────────────────────────────

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Escribí el contenido...',
  readOnly = false,
  minHeight = 300,
  className = '',
}) {
  const editorRef = useRef(null);
  // null significa "no sync aún" → fuerza sync en primer efecto
  const lastHtmlRef = useRef(null);
  const savedSelRef = useRef(null);

  const [active, setActive] = useState({ bold: false, italic: false, underline: false });

  // Barra de link
  const [showLinkBar, setShowLinkBar] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Barra de búsqueda
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findRanges, setFindRanges] = useState([]);
  const [findIdx, setFindIdx] = useState(-1);

  // ── Sync value → innerHTML (sólo cuando cambia externamente) ──────────────
  useEffect(() => {
    if (editorRef.current && value !== lastHtmlRef.current) {
      editorRef.current.innerHTML = value || '';
      lastHtmlRef.current = value;
    }
  }, [value]);

  // ── Emitir cambio ─────────────────────────────────────────────────────────
  const emitChange = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    lastHtmlRef.current = html;
    onChange?.(html);
  }, [onChange]);

  // ── Refrescar estado de formato (negrita / cursiva / subrayado) ───────────
  const updateActive = useCallback(() => {
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }, []);

  // ── Aplicar formato ───────────────────────────────────────────────────────
  const execFmt = useCallback((cmd) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, null);
    emitChange();
    updateActive();
  }, [emitChange, updateActive]);

  // ── Guardar / restaurar selección (para el link) ──────────────────────────
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) {
      savedSelRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (!savedSelRef.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelRef.current);
  }, []);

  // ── Link ──────────────────────────────────────────────────────────────────
  const handleLinkOpen = useCallback(() => {
    saveSelection();
    setLinkUrl('https://');
    setShowLinkBar(true);
    setShowFind(false);
    setFindQuery('');
  }, [saveSelection]);

  const handleLinkInsert = useCallback(() => {
    const url = linkUrl.trim();
    if (!url || url === 'https://') { setShowLinkBar(false); return; }
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('createLink', false, url);
    // Hacer que los links se abran en pestaña nueva
    editorRef.current?.querySelectorAll('a').forEach(a => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    setShowLinkBar(false);
    setLinkUrl('');
    emitChange();
  }, [linkUrl, restoreSelection, emitChange]);

  // ── Búsqueda de texto ─────────────────────────────────────────────────────
  const buildRanges = useCallback((query) => {
    if (!editorRef.current || !query) return [];
    const lowerQ = query.toLowerCase();
    const ranges = [];

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.toLowerCase();
        let idx = text.indexOf(lowerQ);
        while (idx !== -1) {
          const r = document.createRange();
          r.setStart(node, idx);
          r.setEnd(node, idx + query.length);
          ranges.push(r);
          idx = text.indexOf(lowerQ, idx + 1);
        }
      } else {
        node.childNodes.forEach(walk);
      }
    }
    walk(editorRef.current);
    return ranges;
  }, []);

  const selectRange = useCallback((range) => {
    if (!range) return;
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // Scroll a la vista: insertar span temporal
      const span = document.createElement('span');
      range.insertNode(span);
      span.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      span.parentNode?.removeChild(span);
    } catch {
      // No hacer nada si falla (e.g., rango inválido tras editar)
    }
  }, []);

  // Reconstruir rangos al cambiar la query
  useEffect(() => {
    if (!showFind || !findQuery) {
      setFindRanges([]);
      setFindIdx(-1);
      return;
    }
    const ranges = buildRanges(findQuery);
    setFindRanges(ranges);
    setFindIdx(ranges.length > 0 ? 0 : -1);
    if (ranges.length > 0) selectRange(ranges[0]);
  }, [findQuery, showFind, buildRanges, selectRange]);

  const findStep = useCallback((dir) => {
    if (!findRanges.length) return;
    const next = (findIdx + dir + findRanges.length) % findRanges.length;
    setFindIdx(next);
    selectRange(findRanges[next]);
  }, [findRanges, findIdx, selectRange]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`rich-editor-wrapper border border-gray-300 rounded-lg overflow-hidden flex flex-col ${className}`}>

      {/* ── Barra de herramientas ── */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap flex-shrink-0">
          {/* Negrita */}
          <ToolBtn
            active={active.bold}
            onMouseDown={e => { e.preventDefault(); execFmt('bold'); }}
            title="Negrita (Ctrl+B)"
          >
            <span className="font-bold text-base leading-none">B</span>
          </ToolBtn>

          {/* Cursiva */}
          <ToolBtn
            active={active.italic}
            onMouseDown={e => { e.preventDefault(); execFmt('italic'); }}
            title="Cursiva (Ctrl+I)"
          >
            <span className="italic font-serif text-base leading-none">I</span>
          </ToolBtn>

          {/* Subrayado */}
          <ToolBtn
            active={active.underline}
            onMouseDown={e => { e.preventDefault(); execFmt('underline'); }}
            title="Subrayado (Ctrl+U)"
          >
            <span className="underline text-base leading-none">S</span>
          </ToolBtn>

          <Sep />

          {/* Hipervínculo */}
          <ToolBtn
            active={showLinkBar}
            onMouseDown={e => { e.preventDefault(); handleLinkOpen(); }}
            title="Insertar hipervínculo"
          >
            <IconLink />
          </ToolBtn>

          <Sep />

          {/* Buscar */}
          <ToolBtn
            active={showFind}
            onMouseDown={e => { e.preventDefault(); setShowFind(f => !f); setShowLinkBar(false); }}
            title="Buscar texto"
          >
            <IconSearch />
          </ToolBtn>
        </div>
      )}

      {/* ── Barra de link ── */}
      {showLinkBar && !readOnly && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-blue-50 flex-shrink-0">
          <span className="text-xs font-medium text-blue-700 whitespace-nowrap">URL:</span>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://"
            className="form-input text-sm py-0.5 flex-1 min-w-0"
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleLinkInsert(); }
              if (e.key === 'Escape') setShowLinkBar(false);
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleLinkInsert}
            className="btn-primary text-xs py-1 px-3 whitespace-nowrap flex-shrink-0"
          >
            Insertar
          </button>
          <button
            type="button"
            onClick={() => setShowLinkBar(false)}
            className="text-gray-400 hover:text-gray-600 leading-none flex-shrink-0"
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Barra de búsqueda ── */}
      {showFind && !readOnly && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-amber-50 flex-shrink-0">
          <input
            type="text"
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
            placeholder="Buscar en el contenido..."
            className="form-input text-sm py-0.5 flex-1 min-w-0"
            onKeyDown={e => {
              if (e.key === 'Enter') findStep(e.shiftKey ? -1 : 1);
              if (e.key === 'Escape') { setShowFind(false); setFindQuery(''); }
            }}
            autoFocus
          />
          <span className="text-xs text-gray-500 whitespace-nowrap min-w-[40px] text-center">
            {findQuery
              ? (findRanges.length > 0 ? `${findIdx + 1}/${findRanges.length}` : '0/0')
              : ''}
          </span>
          <button
            type="button"
            onClick={() => findStep(-1)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-200 text-gray-600"
            title="Anterior"
          >
            <IconChevronUp />
          </button>
          <button
            type="button"
            onClick={() => findStep(1)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-200 text-gray-600"
            title="Siguiente"
          >
            <IconChevronDown />
          </button>
          <button
            type="button"
            onClick={() => { setShowFind(false); setFindQuery(''); setFindRanges([]); }}
            className="text-gray-400 hover:text-gray-600 leading-none flex-shrink-0"
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Área de edición ── */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={emitChange}
        onKeyUp={updateActive}
        onMouseUp={updateActive}
        className={[
          'rich-editor-body flex-1 px-4 py-3 text-sm text-gray-800 leading-relaxed',
          'focus:outline-none w-full',
          readOnly ? 'bg-gray-50' : 'bg-white',
        ].join(' ')}
        style={{ minHeight, overflowY: 'auto' }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
