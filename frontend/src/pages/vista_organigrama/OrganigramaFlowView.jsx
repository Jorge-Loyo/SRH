/**
 * Vista "Diagrama" del organigrama â€” Ã¡rbol colapsable de cajas conectadas.
 * - Solo el root estÃ¡ expandido al iniciar.
 * - Nodos con hijos: borde primary + Ã­cono de expand/collapse.
 * - Nodos hoja: borde gris, sin Ã­cono.
 * - Al cambiar de perÃ­odo (data cambia), se resetea la expansiÃ³n.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  Handle, Position, useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronDownIcon, ChevronRightIcon, UserIcon } from '@heroicons/react/24/outline';

// â”€â”€ Colores por tipo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TIPO_COLOR = {
  Ministerio:    'bg-gray-700 text-white',
  AREA:          'bg-gray-600 text-white',
  'SSEC/DIREJE': 'bg-gray-500 text-white',
  GO:            'bg-primary-700 text-white',
  SGO:           'bg-primary-600 text-white',
  DG:            'bg-primary-500 text-white',
  DHOS:          'bg-teal-600 text-white',
  SDHOS:         'bg-teal-500 text-white',
  REGIMEN:       'bg-amber-500 text-white',
  DEPT:          'bg-indigo-600 text-white',
  'DEPT CA':     'bg-indigo-500 text-white',
  DIV:           'bg-purple-600 text-white',
  'DIV CA':      'bg-purple-500 text-white',
  UNID:          'bg-sky-600 text-white',
  SECCION:       'bg-sky-500 text-white',
  SECC:          'bg-sky-500 text-white',
};
const tipoColor = (tipo) => TIPO_COLOR[tipo] || 'bg-gray-200 text-gray-700';

// â”€â”€ Constantes de layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NODE_W = 170;
const NODE_H = 90;
const H_GAP  = 12;
const V_GAP  = 52;

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

// â”€â”€ Construir nodos/aristas visibles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildGraph(root, expanded) {
  const rfNodes = [], rfEdges = [];

  function walk(node, x, y, parentId) {
    const id = node._id;
    const hasChildren = !!node.children?.length;
    const isExpanded  = expanded.has(id);

    rfNodes.push({
      id,
      type: 'orgNode',
      position: { x: x - NODE_W / 2, y },
      data: { title: node.title, name: node.name, persona: node.persona, hasChildren, isExpanded },
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
        walk(child, cx + cw / 2, y + NODE_H + V_GAP, id);
        cx += cw + H_GAP;
      }
    }
  }

  walk(root, visibleWidth(root, expanded) / 2, 0, null);
  return { nodes: rfNodes, edges: rfEdges };
}

// â”€â”€ Nodo personalizado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OrgNode({ data }) {
  const { hasChildren, isExpanded, title, name, persona } = data;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{ width: NODE_W }}
        className={[
          'bg-white rounded-xl px-3 py-2.5 shadow-sm transition-all select-none',
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
        <p
          className="text-xs font-semibold text-gray-900 leading-snug"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {name}
        </p>
        {/* Persona */}
        {persona
          ? <p className="text-[10px] text-primary-700 mt-0.5 truncate flex items-center gap-0.5">
              <UserIcon className="w-2.5 h-2.5 flex-shrink-0" />{persona.nombre}
            </p>
          : <p className="text-[10px] text-gray-300 italic mt-0.5">Vacante</p>
        }
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = { orgNode: OrgNode };

function FlowInner({ data }) {
  const { fitView } = useReactFlow();
  const lastActionRef = useRef({ type: null, id: null }); // 'expand' | 'collapse'

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
    () => buildGraph(annotated, expanded),
    [annotated, expanded]
  );

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
        <MiniMap
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
export default function OrganigramaFlowView({ data, resetKey }) {
  return (
    <ReactFlowProvider>
      <FlowInner key={resetKey} data={data} />
    </ReactFlowProvider>
  );
}
