/**
 * Vista "Diagrama" del organigrama â€” Ã¡rbol colapsable de cajas conectadas.
 * - Solo el root estÃ¡ expandido al iniciar.
 * - Nodos con hijos: borde primary + Ã­cono de expand/collapse.
 * - Nodos hoja: borde gris, sin Ã­cono.
 * - Al cambiar de perÃ­odo (data cambia), se resetea la expansiÃ³n.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  Handle, Position, useReactFlow, ReactFlowProvider,
  getViewportForBounds,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { ChevronDownIcon, ChevronRightIcon, UserIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { tipoColor, stripRedundantPrefix } from '../../utils/organigramaHelpers';

// Exportar imagen: escala sobre el tamaño real del diagrama (no del viewport) para alta resolución
const EXPORT_SCALE = 2;
const EXPORT_MAX_DIM = 8000;

// â”€â”€ Constantes de layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NODE_W = 190;
const NODE_H_MIN = 90;      // alto mínimo (nombres cortos, hasta ~2 líneas)
const NAME_LINE_H = 17;     // â‰ˆ 12px (text-xs) * leading-snug
const NAME_PADDING_X = 24;  // px-3 del nodo (12px a cada lado)
const HEADER_FOOTER_H = 70; // alto del nodo sin contar las lÃ­neas del nombre (badge + persona + cÃ³digo + paddings)
const H_GAP  = 12;
const V_GAP  = 52;

// â”€â”€ MediciÃ³n de texto para altura dinÃ¡mica de nodos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Simula el word-wrap real del navegador para estimar cuÃ¡ntas lÃ­neas
// ocuparÃ¡ el nombre dentro del nodo, y asÃ­ calcular su alto ANTES de
// posicionar el Ã¡rbol â€” si no, las filas siguientes podrÃ­an superponerse
// con nombres largos.
const NAME_FONT = '600 12px Inter, system-ui, sans-serif';
let measureCtx = null;
function countWrappedLines(text, availableWidth) {
  if (!text) return 1;
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = NAME_FONT;
  }
  const words = text.split(' ');
  let lines = 1, lineWidth = 0;
  const spaceWidth = measureCtx.measureText(' ').width;
  for (const word of words) {
    const wordWidth = measureCtx.measureText(word).width;
    if (lineWidth > 0 && lineWidth + spaceWidth + wordWidth > availableWidth) {
      lines++;
      lineWidth = wordWidth;
    } else {
      lineWidth += (lineWidth > 0 ? spaceWidth : 0) + wordWidth;
    }
  }
  return lines;
}

function estimateNodeHeight(name) {
  const lines = countWrappedLines(stripRedundantPrefix(name), NODE_W - NAME_PADDING_X);
  return Math.max(NODE_H_MIN, HEADER_FOOTER_H + lines * NAME_LINE_H);
}

// â”€â”€ Asignar IDs estables al Ã¡rbol (muta la copia deep) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function assignIds(node, prefix = 'n0') {
  node._id = prefix;
  node.children?.forEach((c, i) => assignIds(c, `${prefix}-${i}`));
}

// Devuelve [parentId, ...childIds] dado un nodo por su _id
function getDirectChildIds(root, targetId) {
  function find(node) {
    if (node._id === targetId) return [node._id, ...(node.children?.map(c => c._id) || [])];
    for (const c of node.children || []) {
      const r = find(c);
      if (r) return r;
    }
    return null;
  }
  return find(root);
}

// â”€â”€ Ancho visible del subÃ¡rbol (sÃ³lo cuenta hijos si el nodo estÃ¡ expandido) â”€
function visibleWidth(node, expanded) {
  if (!expanded.has(node._id) || !node.children?.length) return NODE_W;
  const total = node.children.reduce(
    (s, c, i) => s + visibleWidth(c, expanded) + (i > 0 ? H_GAP : 0), 0
  );
  return Math.max(total, NODE_W);
}

// â”€â”€ Alto de cada fila (profundidad), segÃºn el nodo visible mÃ¡s alto â”€â”€â”€â”€â”€
function computeRowHeights(root, expanded) {
  const heights = [];
  function visit(node, depth) {
    heights[depth] = Math.max(heights[depth] || 0, estimateNodeHeight(node.name));
    if (node.children?.length && expanded.has(node._id)) {
      node.children.forEach(c => visit(c, depth + 1));
    }
  }
  visit(root, 0);
  return heights;
}

// â”€â”€ Construir nodos/aristas visibles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildGraph(root, expanded, onPersonaClick, highlightId) {
  const rfNodes = [], rfEdges = [];

  // Todas las filas de una misma profundidad comparten el mismo alto (el del
  // nodo mÃ¡s alto de esa fila), asÃ­ siguen quedando alineadas entre sÃ­.
  const rowHeights = computeRowHeights(root, expanded);
  const rowY = [];
  let accY = 0;
  for (let d = 0; d < rowHeights.length; d++) {
    rowY[d] = accY;
    accY += rowHeights[d] + V_GAP;
  }

  function walk(node, x, depth, parentId) {
    const id = node._id;
    const hasChildren = !!node.children?.length;
    const isExpanded  = expanded.has(id);

    rfNodes.push({
      id,
      type: 'orgNode',
      position: { x: x - NODE_W / 2, y: rowY[depth] },
      data: {
        title: node.title, name: node.name, persona: node.persona, codigo: node.id, hasChildren, isExpanded,
        height: estimateNodeHeight(node.name),
        onPersonaClick,
        isHighlighted: highlightId != null && String(node.id) === String(highlightId),
      },
    });

    if (parentId != null) {
      rfEdges.push({
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      });
    }

    if (hasChildren && isExpanded) {
      const totalW = node.children.reduce(
        (s, c, i) => s + visibleWidth(c, expanded) + (i > 0 ? H_GAP : 0), 0
      );
      let cx = x - totalW / 2;
      for (const child of node.children) {
        const cw = visibleWidth(child, expanded);
        walk(child, cx + cw / 2, depth + 1, id);
        cx += cw + H_GAP;
      }
    }
  }

  walk(root, visibleWidth(root, expanded) / 2, 0, null);
  return { nodes: rfNodes, edges: rfEdges };
}

// â”€â”€ Nodo personalizado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OrgNode({ data }) {
  const { hasChildren, isExpanded, title, name, persona, codigo, height, onPersonaClick, isHighlighted } = data;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{ width: NODE_W, minHeight: height }}
        className={[
          'bg-white rounded-xl px-3 py-2.5 shadow-sm transition-all select-none duration-700',
          isHighlighted ? 'ring-4 ring-amber-400 bg-amber-50' : '',
          hasChildren
            ? isExpanded
              ? 'border-2 border-primary-500 cursor-pointer hover:shadow-md hover:border-primary-600'
              : 'border-2 border-primary-300 cursor-pointer hover:border-primary-500 hover:shadow-md'
            : 'border border-gray-300 bg-gray-50 cursor-default',
        ].join(' ')}
      >
        {/* Tipo + indicador */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${tipoColor(title)}`}>
            {title}
          </span>
          {hasChildren && (
            <span className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white transition-colors ${
              isExpanded ? 'bg-primary-600' : 'bg-primary-400'
            }`}>
              {isExpanded
                ? <ChevronDownIcon  className="w-3 h-3" />
                : <ChevronRightIcon className="w-3 h-3" />}
            </span>
          )}
        </div>
        {/* Nombre */}
        <p className="text-xs font-semibold text-gray-900 leading-snug">
          {stripRedundantPrefix(name)}
        </p>
        {/* Persona */}
        {persona
          ? <p
              className="text-[10px] text-primary-700 mt-0.5 truncate flex items-center gap-0.5 hover:underline"
              onClick={e => { e.stopPropagation(); onPersonaClick({ persona, nodeName: stripRedundantPrefix(name), nodeTitle: title }); }}
              title="Ver datos de la persona"
            >
              <UserIcon className="w-2.5 h-2.5 flex-shrink-0" />{persona.nombre}
            </p>
          : <p className="text-[10px] text-amber-600 font-medium italic mt-0.5">Vacante</p>
        }
        {/* Código */}
        {codigo && title !== 'REGIMEN' && (
          <p className="text-[9px] font-mono text-gray-400 mt-1 truncate">{codigo}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = { orgNode: OrgNode };

function FlowInner({ data, sigla, onPersonaClick, jumpSignal, highlightId }) {
  const { fitView } = useReactFlow();
  const lastActionRef = useRef({ type: null, id: null }); // 'expand' | 'collapse'
  const [exporting, setExporting] = useState(false);

  const annotated = useMemo(() => {
    const copy = JSON.parse(JSON.stringify(data));
    assignIds(copy);
    return copy;
  }, [data]);

  const [expanded, setExpanded] = useState(() => new Set([annotated._id]));
  useEffect(() => {
    lastActionRef.current = { type: null, id: null };
    setExpanded(new Set([annotated._id]));
  }, [annotated]);

  // Mapa id real (codigo_reparticion) → _id sintético, para traducir el
  // "camino" de una búsqueda (en ids reales) a los ids que usa este árbol
  // interno de expand/collapse.
  const idMap = useMemo(() => {
    const map = new Map();
    function visit(n) {
      map.set(String(n.id), n._id);
      (n.children || []).forEach(visit);
    }
    visit(annotated);
    return map;
  }, [annotated]);

  // Búsqueda: expandir todos los ancestros del resultado actual
  useEffect(() => {
    if (!jumpSignal) return;
    const idsToExpand = jumpSignal.path.map(rawId => idMap.get(String(rawId))).filter(Boolean);
    if (!idsToExpand.length) return;
    setExpanded(prev => {
      let changed = false;
      const next = new Set(prev);
      idsToExpand.forEach(id => { if (!next.has(id)) { next.add(id); changed = true; } });
      return changed ? next : prev;
    });
  }, [jumpSignal, idMap]);

  // fitView enfocado: al expandir centra en el nodo + hijos nuevos;
  // al colapsar o en carga inicial encuadra todo lo visible.
  useEffect(() => {
    const { type, id } = lastActionRef.current;
    const t = setTimeout(() => {
      if (type === 'expand' && id) {
        const ids = getDirectChildIds(annotated, id);
        if (ids?.length) {
          fitView({ nodes: ids.map(i => ({ id: i })), padding: 0.25, duration: 450 });
          return;
        }
      }
      fitView({ padding: 0.12, duration: 450 });
    }, 120);
    return () => clearTimeout(t);
  }, [expanded, fitView, annotated]);

  const { nodes, edges } = useMemo(
    () => buildGraph(annotated, expanded, onPersonaClick, highlightId),
    [annotated, expanded, onPersonaClick, highlightId]
  );

  // Búsqueda: una vez que el resultado ya está en el grafo (tras expandirse
  // sus ancestros más arriba), centrar la cámara en él. El timeout es más
  // largo que el del efecto de expand/collapse normal de abajo, para que
  // este "gane" la posición final de la cámara.
  useEffect(() => {
    if (!jumpSignal) return;
    const targetRfId = idMap.get(String(jumpSignal.id));
    if (!targetRfId || !nodes.some(n => n.id === targetRfId)) return;
    const t = setTimeout(() => {
      fitView({ nodes: [{ id: targetRfId }], padding: 0.5, duration: 450, maxZoom: 1.2 });
    }, 250);
    return () => clearTimeout(t);
  }, [jumpSignal, idMap, fitView, nodes]);

  const onNodeClick = useCallback((_, node) => {
    if (!node.data.hasChildren) return;
    const id = node.id;
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        lastActionRef.current = { type: 'collapse', id };
      } else {
        next.add(id);
        lastActionRef.current = { type: 'expand', id };
      }
      return next;
    });
  }, []);

  // Exporta como PNG todo el diagrama actualmente renderizado (según lo expandido),
  // no sólo lo visible en pantalla — calcula el bounding box real de los nodos.
  const exportAsImage = useCallback(async () => {
    const viewportEl = document.querySelector('.react-flow__viewport');
    if (!viewportEl || nodes.length === 0) return;
    setExporting(true);
    try {
      // No hay onNodesChange conectado, así que React Flow no expone dimensiones
      // "measured" para estos nodos — calculamos el bounding box nosotros mismos.
      // NODE_W es ancho fijo (inline style); la altura ya viene estimada por nodo
      // (n.data.height, según líneas del nombre) — se agrega un pequeño margen.
      const bounds = nodes.reduce((acc, n) => ({
        x: Math.min(acc.x, n.position.x),
        y: Math.min(acc.y, n.position.y),
        right: Math.max(acc.right, n.position.x + NODE_W),
        bottom: Math.max(acc.bottom, n.position.y + n.data.height + 12),
      }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
      bounds.width = bounds.right - bounds.x;
      bounds.height = bounds.bottom - bounds.y;
      let width  = Math.max(bounds.width  * EXPORT_SCALE, 400);
      let height = Math.max(bounds.height * EXPORT_SCALE, 300);
      if (width > EXPORT_MAX_DIM || height > EXPORT_MAX_DIM) {
        const factor = EXPORT_MAX_DIM / Math.max(width, height);
        width  *= factor;
        height *= factor;
      }
      width  = Math.round(width);
      height = Math.round(height);
      const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.1, 4, 0.08);

      const dataUrl = await toPng(viewportEl, {
        backgroundColor: '#fafafa',
        width,
        height,
        pixelRatio: 1,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        },
      });

      const date = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.download = `organigrama-${sigla || 'hospital'}-${date}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[exportAsImage] Error:', err);
      alert('Error al exportar el organigrama. Por favor intentá nuevamente.');
    } finally {
      setExporting(false);
    }
  }, [nodes, sigla]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} />
        <Panel position="top-right">
          <button
            type="button"
            onClick={exportAsImage}
            disabled={exporting}
            title="Descargar diagrama como imagen PNG"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            {exporting ? 'Generando...' : 'Descargar imagen'}
          </button>
        </Panel>
        <MiniMap
          className="hidden sm:block"
          nodeColor={n => n.data.hasChildren ? '#0f766e' : '#cbd5e1'}
          style={{ height: 100 }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

// key=resetKey remonta FlowInner al reiniciar (reset de estado garantizado)
export default function OrganigramaFlowView({ data, resetKey, sigla, onPersonaClick, jumpSignal, highlightId }) {
  return (
    <ReactFlowProvider>
      <FlowInner
        key={resetKey} data={data} sigla={sigla} onPersonaClick={onPersonaClick}
        jumpSignal={jumpSignal} highlightId={highlightId}
      />
    </ReactFlowProvider>
  );
}
