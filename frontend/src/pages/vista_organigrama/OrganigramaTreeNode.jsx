import { useState, useEffect, useRef, memo } from 'react';
import { ChevronRightIcon, ChevronDownIcon, UserIcon } from '@heroicons/react/24/outline';
import { tipoColor, stripRedundantPrefix } from '../../utils/organigramaHelpers';

// Recorre el árbol y junta todos los puestos sin persona asignada, con el
// camino jerárquico hasta cada uno. Los contenedores de "REGIMEN" no cuentan
// como vacantes aunque tampoco tengan persona.
// `path` es el camino de nombres (para mostrar) e `idPath` el camino de ids
// de los ancestros (para poder saltar/expandir el árbol o el diagrama hasta
// llegar a esta vacante, igual que hace el buscador vía `jumpSignal`).
export function collectVacantes(node, path = [], idPath = []) {
  const result = [];
  if (!node.persona && node.title !== 'REGIMEN') {
    result.push({ id: node.id, title: node.title, name: stripRedundantPrefix(node.name), path, idPath, regimen_empleo: node.regimen_empleo });
  }
  const childPath = [...path, stripRedundantPrefix(node.name)];
  const childIdPath = [...idPath, node.id];
  (node.children || []).forEach(child => {
    result.push(...collectVacantes(child, childPath, childIdPath));
  });
  return result;
}

export const TreeNode = memo(function TreeNode({ node, depth = 0, onPersonaClick, forceOpenIds, highlightId }) {
  const [open, setOpen] = useState(depth < 3);
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 20;
  const isHighlighted = highlightId != null && String(node.id) === String(highlightId);
  const rowRef = useRef(null);

  useEffect(() => {
    if (forceOpenIds?.has(node.id)) setOpen(true);
  }, [forceOpenIds, node.id]);

  useEffect(() => {
    if (isHighlighted) rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [isHighlighted]);

  return (
    <div>
      <div
        ref={rowRef}
        className={`flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors duration-700
          ${depth === 0 ? 'mb-1' : ''} ${isHighlighted ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}
        style={{ marginLeft: indent }}>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded ${hasChildren ? 'text-gray-500 hover:text-gray-800' : 'text-transparent cursor-default'}`}>
          {hasChildren
            ? (open ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />)
            : null}
        </button>

        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 mt-0.5 ${tipoColor(node.title)}`}>
          {node.title}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-tight">{stripRedundantPrefix(node.name)}</p>
          {node.persona ? (
            <p
              className="text-xs text-primary-700 flex items-center gap-1 mt-0.5 cursor-pointer hover:underline"
              onClick={() => onPersonaClick({ persona: node.persona, nodeName: stripRedundantPrefix(node.name), nodeTitle: node.title })}
              title="Ver datos de la persona"
            >
              <UserIcon className="w-3 h-3 flex-shrink-0" />
              {node.persona.nombre}
              {node.persona.cargo && <span className="text-gray-600 ml-1">· {node.persona.cargo}</span>}
            </p>
          ) : (
            <p className="text-xs text-amber-600 font-medium mt-0.5 italic">Vacante</p>
          )}
          {node.id && node.title !== 'REGIMEN' && (
            <span className="inline-block text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1">
              {node.id}
            </span>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id} node={child} depth={depth + 1} onPersonaClick={onPersonaClick}
              forceOpenIds={forceOpenIds} highlightId={highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
});
