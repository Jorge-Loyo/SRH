import React, { useMemo, useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { Box, H3, Text, Button, Icon } from '@adminjs/design-system'
import Tree from 'react-d3-tree'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'
import PeriodoSelector from '../reutilizables/periodo-selector'
import { hospitalsMap } from '../datos-comunes/hospitals-data'

// ✅ CENTRALIZADO: Tipos de unidades organizativas con colores y ordenamiento
const UNIT_TYPES = {
  'Ministerio': { order: 0, border: '#1e293b', badge: '#334155', badgeText: '#fff', label: 'Ministerio' },
  'AREA': { order: 1, border: '#dc2626', badge: '#ef4444', badgeText: '#fff', label: 'AREA' },
  'SSEC/DIREJE': { order: 2, border: '#7c3aed', badge: '#8b5cf6', badgeText: '#fff', label: 'SSEC/DIREJE' },
  'GO': { order: 3, border: '#0891b2', badge: '#06b6d4', badgeText: '#fff', label: 'GO' },
  'SGO': { order: 4, border: '#ca8a04', badge: '#eab308', badgeText: '#000', label: 'SGO' },
  'DG': { order: 5, border: '#7c3aed', badge: '#8b5cf6', badgeText: '#fff', label: 'DG' },
  'F/N DG': { order: 6, border: '#6d28d9', badge: '#7c3aed', badgeText: '#fff', label: 'F/N DG' },
  'DHOS': { order: 7, border: '#be123c', badge: '#e11d48', badgeText: '#fff', label: 'DHOS' },
  'REGIMEN': { order: 9, border: '#0369a1', badge: '#0284c7', badgeText: '#fff', label: '📋 RÉGIMEN' },
  'DEPT': { order: 10, border: '#7e22ce', badge: '#9333ea', badgeText: '#fff', label: 'DEPT' },
  'DEPT CA': { order: 10.5, border: '#a21caf', badge: '#c026d3', badgeText: '#fff', label: 'DEPT CA' },
  'SECCION': { order: 13, border: '#15803d', badge: '#16a34a', badgeText: '#fff', label: 'SECCION' },
  'SECC': { order: 13, border: '#15803d', badge: '#16a34a', badgeText: '#fff', label: 'SECC' },
  'SECCION CA': { order: 13.5, border: '#047857', badge: '#059669', badgeText: '#fff', label: 'SECCION CA' },
  'DIV': { order: 11, border: '#1d4ed8', badge: '#2563eb', badgeText: '#fff', label: 'DIV' },
  'DIV CA': { order: 11.5, border: '#1e40af', badge: '#3b82f6', badgeText: '#fff', label: 'DIV CA' },
  'UNID': { order: 12, border: '#c2410c', badge: '#ea580c', badgeText: '#fff', label: 'UNID' },
  'SDHOS': { order: 8, border: '#991b1b', badge: '#dc2626', badgeText: '#fff', label: 'SDHOS' },
  'UAI DG': { order: 8.5, border: '#6d28d9', badge: '#7c3aed', badgeText: '#fff', label: 'UAI DG' },
  'F/N DEJE': { order: 8.6, border: '#5b21b6', badge: '#6d28d9', badgeText: '#fff', label: 'F/N DEJE' },
  'UAI MSTR': { order: 8.7, border: '#1e40af', badge: '#2563eb', badgeText: '#fff', label: 'UAI MSTR' },
  'PLTA TRANS. DOCENTE': { order: 8.8, border: '#047857', badge: '#059669', badgeText: '#fff', label: 'PLTA TRANS. DOCENTE' },
  'F/N MSTR - GO': { order: 8.9, border: '#0e7490', badge: '#0891b2', badgeText: '#fff', label: 'F/N MSTR - GO' },
}

// ✅ Mapeo de colores según tipo - usa UNIT_TYPES centralizado
const getColorByType = (tipo) => {
  return UNIT_TYPES[tipo] || { border: '#64748b', badge: '#94a3b8', badgeText: '#fff', label: tipo || 'OTROS' }
}

// ✅ Lista de prefijos ordenada por longitud (mayor a menor) para evitar duplicados
const TYPE_PREFIXES = Object.keys(UNIT_TYPES).sort((a, b) => b.length - a.length)

// Función para envolver texto en múltiples líneas
const wrapText = (text, maxCharsPerLine = 24) => {
  if (!text) return []
  
  const words = text.split(' ')
  const lines = []
  let currentLine = ''
  
  words.forEach(word => {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  })
  
  if (currentLine) lines.push(currentLine)
  return lines.slice(0, 4) // Máximo 4 líneas (aumentado de 3 a 4)
}

// Función para ocultar el prefijo de tipo si el nombre comienza con él
const removeTypePrefix = (name) => {
  if (!name) return name
  
  // Ordenar por longitud descendente para que "DEPT CA" se detecte antes que "DEPT"
  const sortedPrefixes = [...TYPE_PREFIXES].sort((a, b) => b.length - a.length)
  
  for (const prefix of sortedPrefixes) {
    if (name.startsWith(prefix)) {
      const remaining = name.substring(prefix.length).trim()
      return remaining || name // Si queda algo, devolverlo; si no, devolver el original
    }
  }
  
  return name
}

// Componente de nodo personalizado para react-d3-tree - MEMOIZADO
const CustomNodeComponent = React.memo(({ nodeDatum, toggleNode }) => {
  const titleText = nodeDatum.attributes?.title
  const colors = useMemo(() => getColorByType(titleText), [titleText])
  const hasChildren = nodeDatum.children && nodeDatum.children.length > 0
  const isRegimen = titleText === 'REGIMEN'
  const persona = nodeDatum.attributes?.persona // Obtener persona del nodo
  
  // SIEMPRE mostrar el nombre del nodo (departamento/área)
  const nodeName = removeTypePrefix(nodeDatum.name)
  
  // Además, mostrar la persona asignada o "VACANTE"
  const personaText = persona ? persona.nombre : (isRegimen ? null : 'VACANTE')
  
  // Envolver texto en múltiples líneas
  const nameLines = wrapText(nodeName, isRegimen ? 28 : 22)

  // CÁLCULO DINÁMICO DE ALTURA según contenido real
  const badgeHeight = 26
  const badgeMarginTop = 10
  const badgeMarginBottom = 20 // Aumentado de 15 a 20 para mejor separación
  const lineHeight = 18
  const personaHeight = personaText ? 14 : 0 // Altura del texto de persona
  const personaMargin = personaText ? 16 : 0 // Margen superior para persona
  const arrowSpace = 25 // Espacio para la flecha
  const bottomPadding = 8
  
  // Altura total calculada dinámicamente
  const nodeHeight = isRegimen 
    ? 120 
    : (badgeMarginTop + badgeHeight + badgeMarginBottom + 
       (nameLines.length * lineHeight) + 
       personaMargin + personaHeight + 
       arrowSpace + bottomPadding)
  
  const nodeWidth = isRegimen ? 340 : 300
  
  // Posiciones calculadas desde arriba hacia abajo
  const badgeY = -nodeHeight / 2 + badgeMarginTop
  const badgeTextY = badgeY + badgeHeight / 2
  
  // Nombre del nodo: después del badge
  const nombreInicioY = badgeY + badgeHeight + badgeMarginBottom
  
  // Persona: después del nombre del nodo
  const personaY = nombreInicioY + (nameLines.length * lineHeight) + (personaMargin / 2)
  
  // Flecha: en la parte inferior
  const arrowY = nodeHeight / 2 - 20

  return (
    <g style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
      {/* Rectángulo del nodo */}
      <rect
        width={nodeWidth}
        height={nodeHeight}
        x={-nodeWidth / 2}
        y={-nodeHeight / 2}
        fill="#fff"
        stroke={colors.border}
        strokeWidth="2"
        rx="12"
        style={{
          cursor: hasChildren ? 'pointer' : 'default',
          filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.15))'
        }}
        onClick={() => hasChildren && toggleNode()}
      />
      
      {/* Badge con el tipo */}
      <rect
        width={isRegimen ? "140" : "80"}
        height={badgeHeight}
        x={isRegimen ? "-70" : "-40"}
        y={badgeY}
        fill={colors.badge}
        rx="6"
        style={{ filter: 'drop-shadow(0px 3px 8px rgba(0,0,0,0.25))' }}
      />
      
      {/* Badge text - tipo de unidad */}
      <text
        className="rd3t-label__title"
        x="0"
        y={badgeTextY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.badgeText}
        fontSize="13"
        fontWeight="800"
        letterSpacing="0.3"
      >
        {colors.label}
      </text>
      
      {/* Nombre del nodo - multilinea */}
      <g onClick={() => hasChildren && toggleNode()} style={{ cursor: hasChildren ? 'pointer' : 'default' }}>
        {nameLines.map((line, idx) => (
          <text
            key={idx}
            className="rd3t-label__title"
            x="0"
            y={nombreInicioY + idx * lineHeight}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            fontSize={isRegimen ? "16" : (nameLines.length > 2 ? "12" : "14")}
            fontWeight={isRegimen ? "800" : "700"}
          >
            {line}
          </text>
        ))}
      </g>
      
      {/* Persona asignada o VACANTE - usando foreignObject para evitar interceptación de estilos */}
      {!isRegimen && personaText && (
        <foreignObject
          x={-nodeWidth / 2}
          y={personaY - 7}
          width={nodeWidth}
          height="20"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: personaText === 'VACANTE' ? '600' : '400',
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: personaText === 'VACANTE' ? '#ea580c' : '#1f2937',
              fontStyle: 'normal',
              textAlign: 'center',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}
          >
            {personaText === 'VACANTE' ? '⚠️ VACANTE' : `👤 ${personaText}`}
          </div>
        </foreignObject>
      )}
      
      {/* Indicador de expandir/colapsar */}
      {hasChildren && (
        <text
          x="0"
          y={arrowY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.border}
          fontSize="22"
          fontWeight="700"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => toggleNode()}
        >
          {nodeDatum.__rd3t?.collapsed ? '▶' : '▼'}
        </text>
      )}
    </g>
  )
})

// ✅ Wrapper para usar con react-d3-tree
const renderCustomNode = (props) => <CustomNodeComponent {...props} />

const OrganigramaDetalle = () => {
  // ✅ Verificación de window para evitar problemas en SSR/testing
  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams()
    return new URLSearchParams(window.location.search)
  }, [])
  const hospitalCode = params.get('hospital') || 'HGACA'
  const hospitalName = hospitalsMap[hospitalCode] || hospitalCode
  
  const [organigramaData, setOrganigramaData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fullScreenMode, setFullScreenMode] = useState(false)
  const [translate, setTranslate] = useState({ x: 900, y: 100 })
  const [treeData, setTreeData] = useState(null)
  const [periodo, setPeriodo] = useState('') // Estado de periodo
  
  const treeContainerRef = useRef(null)
  const normalContainerRef = useRef(null)
  const fullscreenContainerRef = useRef(null)

  const { error: errorFromHook, handleError, clearError } = useErrorHandler()

  // Inyectar estilos globales para forzar tipografía simple en el SVG
  useEffect(() => {
    const styleId = 'organigrama-text-override'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Sobrescribir estilos de react-d3-tree para texto de nodos */
        .rd3t-label__title,
        .rd3t-label__attributes {
          font-weight: 600 !important;
          font-family: Arial, Helvetica, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
        }
        
        /* Igualar stroke en nodos desplegables y no desplegables */
        .rd3t-node,
        .rd3t-leaf-node {
          stroke-width: 2 !important;
        }
        
        /* Deshabilitar zoom en doble click */
        .rd3t-tree-container,
        .rd3t-tree-container svg {
          pointer-events: auto !important;
        }
        .rd3t-tree-container svg * {
          pointer-events: auto !important;
        }
        
        /* Asegurar que textos sin className tengan estilo normal (para personas) */
        .rd3t-tree-container text:not([class]) {
          font-weight: 400 !important;
          -webkit-font-smoothing: antialiased !important;
        }
      `
      document.head.appendChild(style)
    }
    return () => {
      const style = document.getElementById(styleId)
      if (style) style.remove()
    }
  }, [])

  // Función para convertir el formato del backend al formato de react-d3-tree - MEMOIZADA
  const convertToD3Format = useMemo(() => {
    const convert = (node, collapsed = true) => {
      if (!node) return null
      
      return {
        name: node.name,
        attributes: {
          title: node.title,
          id: node.id,
          persona: node.persona || null // Incluir persona en atributos
        },
        __rd3t: { collapsed },
        children: node.children && node.children.length > 0 
          ? node.children.map(child => convert(child, collapsed))
          : undefined
      }
    }
    return convert
  }, [])
  
  // Función para resetear todo - MEMOIZADA
  const resetOrganigrrama = useMemo(() => () => {
    if (organigramaData) {
      const resetData = convertToD3Format(organigramaData, true)
      setTreeData({ ...resetData })
    }
  }, [organigramaData, convertToD3Format])
  
  useEffect(() => {
    if (!periodo) {
      setLoading(false)
      return
    }
    
    // ✅ AbortController: Patrón moderno para cancelar fetches al desmontar
    const abortController = new AbortController()
    setLoading(true)
    setError(null)
    clearError()
    
    const url = `/api/organigrama?sigla=${encodeURIComponent(hospitalCode)}&periodo=${encodeURIComponent(periodo)}`
    
    fetch(url, { signal: abortController.signal })
      .then(res => res.json())
      .then(json => {
        if (json.error || !json.data) {
          setError(json.error || 'No se encontró organigrama')
          setOrganigramaData(null)
          setTreeData(null)
        } else {
          setOrganigramaData(json.data)
          const d3Data = convertToD3Format(json.data, true)
          setTreeData(d3Data)
        }
        setLoading(false)
      })
      .catch(err => {
        // ✅ AbortError es normal cuando el componente se desmonta
        if (err.name === 'AbortError') return
        
        // ✅ Usar handleError para categorización automática de errores
        handleError(err, 'OrganigramaDetalle.fetchOrganigramadata')
        setLoading(false)
      })
    
    // ✅ Cleanup: Abortar fetch pendiente al desmontar
    return () => { abortController.abort() }
  }, [hospitalCode, periodo, handleError, clearError])

  // Actualizar posición del árbol al redimensionar
  useEffect(() => {
    if (!treeContainerRef.current || fullScreenMode) return
    
    const updateTranslate = () => {
      const { width } = treeContainerRef.current.getBoundingClientRect()
      setTranslate({ x: Math.max(width / 2 - 100, 600), y: 130 })
    }
    
    updateTranslate()
    window.addEventListener('resize', updateTranslate)
    return () => window.removeEventListener('resize', updateTranslate)
  }, [fullScreenMode])

  const enterFullScreen = () => setFullScreenMode(true)
  const exitFullScreen = () => setFullScreenMode(false)
  
  // Exportar organigrama como imagen PNG
  const exportAsImage = async () => {
    console.log('[exportAsImage] Iniciando exportación', { fullScreenMode })
    const container = fullScreenMode ? fullscreenContainerRef.current : normalContainerRef.current
    console.log('[exportAsImage] Container encontrado:', !!container)
    if (!container) {
      console.error('[exportAsImage] No se encontró container')
      return
    }
    
    const svg = container.querySelector('svg')
    console.log('[exportAsImage] SVG encontrado:', !!svg)
    if (!svg) {
      console.error('[exportAsImage] No se encontró SVG en el container')
      return
    }
    
    try {
      // Clonar el SVG para no modificar el original
      const svgClone = svg.cloneNode(true)
      
      // Obtener las dimensiones completas del contenido SVG
      const bbox = svg.getBBox()
      const padding = 50
      
      // Configurar dimensiones del SVG clonado
      const width = bbox.width + padding * 2
      const height = bbox.height + padding * 2
      svgClone.setAttribute('width', width)
      svgClone.setAttribute('height', height)
      svgClone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`)
      
      // Agregar fondo blanco al SVG (antes de los estilos)
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bgRect.setAttribute('x', bbox.x - padding)
      bgRect.setAttribute('y', bbox.y - padding)
      bgRect.setAttribute('width', width)
      bgRect.setAttribute('height', height)
      bgRect.setAttribute('fill', '#fafafa')
      
      // Insertar el rectángulo de fondo como primer elemento
      if (svgClone.firstChild) {
        svgClone.insertBefore(bgRect, svgClone.firstChild)
      } else {
        svgClone.appendChild(bgRect)
      }
      
      // Inyectar estilos CSS directamente en el SVG para que se preserven
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style')
      styleElement.textContent = `
        .rd3t-link { stroke: #999 !important; stroke-width: 2 !important; fill: none !important; }
        .rd3t-label__title, .rd3t-label__attributes { 
          font-weight: 600 !important; 
          font-family: Arial, Helvetica, sans-serif !important;
        }
        text { font-family: Arial, Helvetica, sans-serif !important; }
      `
      svgClone.appendChild(styleElement)
      
      // Serializar el SVG clonado
      const svgData = new XMLSerializer().serializeToString(svgClone)
      
      // Crear canvas con alta resolución
      const scale = 3 // 3x para mejor calidad
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      // Llenar fondo blanco
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Crear imagen desde SVG usando data URI
      const img = new Image()
      
      img.onload = () => {
        console.log('[exportAsImage] Imagen cargada, dibujando en canvas')
        // Dibujar la imagen escalada en el canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Convertir canvas a PNG
        canvas.toBlob((blob) => {
          const link = document.createElement('a')
          const date = new Date().toISOString().slice(0, 10)
          link.download = `organigrama-${hospitalCode}-${date}.png`
          link.href = URL.createObjectURL(blob)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(link.href)
          console.log('[exportAsImage] Descarga PNG completada')
        }, 'image/png')
      }
      
      img.onerror = () => {
        console.error('[exportAsImage] Error al cargar imagen')
        alert('Error al exportar el organigrama. Por favor intente nuevamente.')
      }
      
      // Usar data URI (base64 con UTF-8)
      const svg64 = btoa(unescape(encodeURIComponent(svgData)))
      img.src = `data:image/svg+xml;base64,${svg64}`
      
    } catch (err) {
      console.error('[exportAsImage] Error:', err)
      handleError(err, 'OrganigramaDetalle.exportImage')
    }
  }
  
  // Bloquear doble click en SVG
  useEffect(() => {
    const container = fullScreenMode ? fullscreenContainerRef.current : normalContainerRef.current
    if (!container) return
    
    const handleDoubleClick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      return false
    }
    
    const timeoutId = setTimeout(() => {
      const svg = container.querySelector('svg')
      if (svg) {
        svg.addEventListener('dblclick', handleDoubleClick, { capture: true })
      }
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      const svg = container?.querySelector('svg')
      if (svg) {
        svg.removeEventListener('dblclick', handleDoubleClick, { capture: true })
      }
    }
  }, [treeData, fullScreenMode])
  
  // Configuración dinámica del Tree según la vista
  const treeConfig = {
    data: treeData,
    translate: fullScreenMode ? { x: window.innerWidth / 2, y: 80 } : translate,
    orientation: "vertical",
    pathFunc: "step",
    collapsible: true,
    initialDepth: 1,
    separation: { siblings: 1.3, nonSiblings: 2.0 },
    nodeSize: { x: 300, y: 250 },
    renderCustomNodeElement: renderCustomNode,
    styles: {
      links: {
        stroke: '#999',
        strokeWidth: 2,
      },
    },
    zoom: fullScreenMode ? 0.60 : 0.75,
    scaleExtent: fullScreenMode ? { min: 0.15, max: 1.4 } : { min: 0.3, max: 1.2 },
    translateExtent: fullScreenMode 
      ? { min: { x: -1000, y: -300 }, max: { x: window.innerWidth + 1000, y: 2000 } }
      : { min: { x: -600, y: -200 }, max: { x: 1600, y: 1200 } },
    enableLegacyTransitions: false,
    transitionDuration: 0,
    centeringTransitionDuration: 0,
    shouldCollapseNeighborNodes: false,
    draggable: true,
    zoomable: true,
    onNodeDoubleClick: () => {}, // Deshabilitar zoom en doble click
  }

  // Determinar si mostrar Tree o mensaje
  const hasData = treeData && !error && !loading
  const showMessage = loading || !periodo || !organigramaData || error
  
  const noDataMessage = loading && periodo
    ? 'Cargando organigrama...'
    : !periodo 
    ? 'Seleccione un periodo para cargar el organigrama'
    : error 
    ? error
    : !organigramaData
    ? `No hay datos de organigrama para el periodo ${periodo}. Seleccione un periodo con datos.`
    : null

  if (errorFromHook) {
    return <ErrorFallback error={errorFromHook} onRetry={() => window.location.reload()} componentName="OrganigramaDetalle" />
  }

  return (
    <>
      {/* Vista Normal */}
      <Box style={{ padding: 16, display: fullScreenMode ? 'none' : 'block' }}>
        <BackButton />
        <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Box mb="lg" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <H3 style={{ margin: 0, fontSize: 22, marginBottom: 8 }}>{hospitalName}</H3>
              <Text style={{ margin: 0, opacity: 0.7, marginBottom: 16 }}>Organigrama del hospital - Haga clic en los nodos para expandir/colapsar</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <Box style={{ minWidth: 200 }}>
                <PeriodoSelector
                  hospital={hospitalCode}
                  periodo={periodo}
                  onPeriodoChange={setPeriodo}
                />
              </Box>
              <Button onClick={enterFullScreen} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 'fit-content' }}>
                <Icon icon="Maximize" />
                Vista Completa
              </Button>
            </div>
          </Box>

          {/* Área del organigrama - Vista Normal */}
          <Box
            ref={treeContainerRef}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              background: '#fafafa',
              height: '70vh',
              width: '100%',
              position: 'relative',
            }}
            onDoubleClick={(e) => e.preventDefault()}
          >
            <div ref={normalContainerRef} style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              display: fullScreenMode ? 'none' : 'block',
            }}>
              {!fullScreenMode && treeData && <Tree key="org-tree-normal" {...treeConfig} />}
            </div>
            
            {/* Mensaje cuando no hay datos - Vista Normal */}
            {showMessage && !fullScreenMode && (
              <Box style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
                zIndex: 10,
              }}>
                <Text style={{ color: '#888', fontSize: 16 }}>
                  {noDataMessage}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
        <UserInfo />
      </Box>

      {/* Modal de Pantalla Completa */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#fafafa',
          zIndex: 9999,
          display: fullScreenMode ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        {/* Header del modal */}
        <Box
          style={{
            padding: '16px 24px',
            background: '#fff',
            borderBottom: '2px solid #111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <H3 style={{ margin: 0, fontSize: 20 }}>{hospitalName} - Vista Completa</H3>
            <Text style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
              Use la rueda del mouse para zoom, arrastre para navegar
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={exportAsImage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="Download" />
              Exportar Vista Actual
            </Button>
            <Button onClick={resetOrganigrrama} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="Refresh" />
              Reiniciar
            </Button>
            <Button onClick={exitFullScreen} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="Minimize" />
              Cerrar Vista Completa
            </Button>
          </div>
        </Box>

        {/* Contenedor del organigrama - Vista Completa */}
        <Box
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
          onDoubleClick={(e) => e.preventDefault()}
        >
          <div ref={fullscreenContainerRef} style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            display: !fullScreenMode ? 'none' : 'block',
          }}>
            {fullScreenMode && treeData && <Tree key="org-tree-fullscreen" {...treeConfig} />}
          </div>
          
          {/* Mensaje cuando no hay datos - Vista Fullscreen */}
          {showMessage && fullScreenMode && (
            <Box style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fafafa',
              zIndex: 10,
            }}>
              <Text style={{ color: '#888', fontSize: 16 }}>
                {noDataMessage}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </>
  )
}

export default OrganigramaDetalle

// ✅ PropTypes: Validación de componentes en desarrollo
CustomNodeComponent.propTypes = {
  nodeDatum: PropTypes.shape({
    name: PropTypes.string,
    attributes: PropTypes.shape({
      title: PropTypes.string,
      id: PropTypes.string,
      persona: PropTypes.object
    }),
    children: PropTypes.array,
    __rd3t: PropTypes.object
  }),
  toggleNode: PropTypes.func
}

OrganigramaDetalle.propTypes = {}
