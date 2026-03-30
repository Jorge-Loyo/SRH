/**
 * UserInfo - Componente que inyecta información del usuario en el sidebar de AdminJS
 * También maneja la visibilidad del sidebar según el rol del usuario
 * 
 * IMPORTANTE: Este componente usa manipulación directa del DOM porque AdminJS no expone
 * el sidebar como componente React modificable. Es una solución pragmática para:
 * 1. Mostrar nombre de usuario y rol en el sidebar
 * 2. Ocultar elementos del sidebar según permisos
 * 3. Evitar FOWC (Flash of Wrong Content) al cargar
 */
import React, { useEffect } from 'react'
import { useCurrentAdmin } from 'adminjs'
import { createRoot } from 'react-dom/client'

// Inyectar CSS global inmediatamente para ocultar sidebar de roles específicos sin flash
if (typeof document !== 'undefined' && !document.getElementById('role-sidebar-hide-style')) {
  const style = document.createElement('style')
  style.id = 'role-sidebar-hide-style'
  style.textContent = `
    /* CRÍTICO: Ocultar TODO el sidebar por defecto hasta que la clase de rol esté aplicada */
    body:not(.admin-role):not(.editor-role):not(.director-role):not(.viewer-role) [class*="Sidebar"] {
      visibility: hidden !important;
      opacity: 0 !important;
    }
    
    /* Mostrar sidebar cuando la clase de rol está lista */
    body.admin-role [class*="Sidebar"],
    body.editor-role [class*="Sidebar"],
    body.director-role [class*="Sidebar"],
    body.viewer-role [class*="Sidebar"] {
      visibility: visible !important;
      opacity: 1 !important;
      transition: opacity 150ms ease-in;
    }
    
    /* Filtrar elementos del sidebar según el rol */
    body.admin-role [class*="Sidebar"] > *:not(:first-child):not(#user-info-injected):not(#metrics-panel-injected),
    body.admin-role [class*="Sidebar"] nav,
    body.admin-role [class*="Sidebar"] section,
    body.admin-role [class*="Sidebar"] ul,
    body.admin-role [class*="Navigation"],
    body.admin-role [class*="Section"],
    body.editor-role [class*="Sidebar"] > *:not(:first-child):not(#user-info-injected):not(#metrics-panel-injected),
    body.editor-role [class*="Sidebar"] nav,
    body.editor-role [class*="Sidebar"] section,
    body.editor-role [class*="Sidebar"] ul,
    body.editor-role [class*="Navigation"],
    body.editor-role [class*="Section"],
    body.director-role [class*="Sidebar"] > *:not(:first-child):not(#user-info-injected):not(#metrics-panel-injected),
    body.director-role [class*="Sidebar"] nav,
    body.director-role [class*="Sidebar"] section,
    body.director-role [class*="Sidebar"] ul,
    body.director-role [class*="Navigation"],
    body.director-role [class*="Section"],
    body.viewer-role [class*="Sidebar"] > *:not(:first-child):not(#user-info-injected):not(#metrics-panel-injected),
    body.viewer-role [class*="Sidebar"] nav,
    body.viewer-role [class*="Sidebar"] section,
    body.viewer-role [class*="Sidebar"] ul,
    body.viewer-role [class*="Navigation"],
    body.viewer-role [class*="Section"] {
      display: none !important;
    }
    body.director-role [class*="Sidebar"] > *:first-child {
      pointer-events: none !important;
      cursor: default !important;
    }

    /* === TOGGLE SIDEBAR === */
    body.sidebar-collapsed [class*="Sidebar"] {
      display: none !important;
    }

    #sidebar-toggle-btn {
      position: fixed;
      top: 14px;
      left: 14px;
      z-index: 99999;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      color: #444;
      padding: 0;
      line-height: 1;
    }
    #sidebar-toggle-btn:hover {
      background: #ebebeb;
    }
  `
  document.head.appendChild(style)
  
  // OPTIMIZACIÓN CRÍTICA: Restaurar clase de rol desde sessionStorage ANTES de que React renderice
  // Esto evita el flash del sidebar (FOWC) durante los primeros milisegundos
  // La clase se guardó en login (ver auth.js) y persiste durante la sesión
  const savedRole = sessionStorage.getItem('admin_user_role');
  if (savedRole && ['admin-role', 'editor-role', 'director-role', 'viewer-role'].includes(savedRole)) {
    // ✅ Verificar que document.body existe antes de acceder
    if (document.body) {
      document.body.classList.add(savedRole);
    }
  }

  // Restaurar estado de sidebar colapsado desde sessionStorage
  if (sessionStorage.getItem('sidebar_collapsed') === 'true' && document.body) {
    document.body.classList.add('sidebar-collapsed');
  }
}

const UserInfo = () => {
  const [currentAdmin] = useCurrentAdmin()

  // Aplicar clase CSS al body según el rol (activa ocultamiento instantáneo)
  useEffect(() => {
    if (!currentAdmin?.role) return

    // Remover todas las clases de rol primero
    document.body.classList.remove('admin-role', 'editor-role', 'director-role', 'viewer-role')
    
    // Agregar la clase correspondiente al rol actual
    const roleClass = `${currentAdmin.role}-role`;
    if (['admin-role', 'editor-role', 'director-role', 'viewer-role'].includes(roleClass)) {
      document.body.classList.add(roleClass)
    }

    // ✅ Cleanup: remover clases al desmontar
    return () => {
      if (document.body) {
        document.body.classList.remove('admin-role', 'editor-role', 'director-role', 'viewer-role')
      }
    }
  }, [currentAdmin])

  useEffect(() => {
    if (!currentAdmin || typeof document === 'undefined' || !document.body) return

    // Mapeo de roles a español
    const roleLabels = {
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Visualizador',
      director: 'Director',
    }

    const roleDisplay = roleLabels[currentAdmin.role] || currentAdmin.role
    const hospitalDisplay = currentAdmin.role === 'director' ? (currentAdmin.hospital_code || '') : ''

    // Buscar el sidebar
    const sidebar = document.querySelector('[class*="Sidebar"]') || 
                    document.querySelector('.sidebar')

    if (!sidebar) {
      console.warn('[UserInfo] Sidebar no encontrado en el DOM');
      return;
    }

    // Evitar duplicados
    let userInfoDiv = document.getElementById('user-info-injected')
    if (userInfoDiv) {
      // Ya existe, solo actualizar contenido mediante React
      updateExistingUserInfo(userInfoDiv, currentAdmin.username || currentAdmin.email || 'Usuario', roleDisplay, hospitalDisplay)
      return
    }

    // Crear contenedor para React
    userInfoDiv = document.createElement('div')
    userInfoDiv.id = 'user-info-injected'
    
    // Insertar después del logo (primer elemento del sidebar es el logo)
    const children = Array.from(sidebar.children)
    if (children.length > 0) {
      if (children[1]) {
        sidebar.insertBefore(userInfoDiv, children[1])
      } else {
        sidebar.appendChild(userInfoDiv)
      }
    } else {
      sidebar.appendChild(userInfoDiv)
    }

    // Renderizar con React
    const root = createRoot(userInfoDiv)
    root.render(
      <UserInfoContent 
        username={currentAdmin.username || currentAdmin.email || 'Usuario'}
        role={roleDisplay}
        hospital={hospitalDisplay}
      />
    )

    // Guardar root para cleanup
    userInfoDiv._reactRoot = root

    // ✅ Cleanup: desmontar React y remover elemento
    return () => {
      const element = document.getElementById('user-info-injected');
      if (element && element._reactRoot) {
        element._reactRoot.unmount();
        delete element._reactRoot;
      }
      if (element) {
        element.remove();
      }
    };
  }, [currentAdmin])

  // Inyectar botón de toggle del sidebar
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('sidebar-toggle-btn')) return

    const btn = document.createElement('button')
    btn.id = 'sidebar-toggle-btn'
    const collapsed = document.body.classList.contains('sidebar-collapsed')
    btn.textContent = collapsed ? '☰' : '✕'
    btn.title = collapsed ? 'Mostrar navegación' : 'Ocultar navegación'

    btn.addEventListener('click', () => {
      const nowCollapsed = document.body.classList.toggle('sidebar-collapsed')
      btn.textContent = nowCollapsed ? '☰' : '✕'
      btn.title = nowCollapsed ? 'Mostrar navegación' : 'Ocultar navegación'
      sessionStorage.setItem('sidebar_collapsed', nowCollapsed ? 'true' : 'false')
    })

    // Intentar inyectar en el topbar de AdminJS (al lado del sidebar, inicio del header)
    const topbar =
      document.querySelector('[class*="TopBar"]') ||
      document.querySelector('[class*="Topbar"]') ||
      document.querySelector('[class*="top-bar"]') ||
      document.querySelector('[data-testid="topbar"]') ||
      document.querySelector('header[class]')

    if (topbar) {
      // Adaptar estilos para el fondo oscuro del topbar (sobreescribe el CSS fijo)
      btn.style.cssText = [
        'position: static',
        'top: auto',
        'left: auto',
        'z-index: auto',
        'background: rgba(255,255,255,0.15)',
        'border: 1px solid rgba(255,255,255,0.3)',
        'color: #fff',
        'box-shadow: none',
        'margin-right: 8px',
        'flex-shrink: 0',
      ].join(';')
      btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.28)' })
      btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.15)' })
      topbar.prepend(btn)
    } else {
      // Fallback: posición fija esquina superior izquierda (comportamiento original)
      document.body.appendChild(btn)
    }

    return () => {
      const existing = document.getElementById('sidebar-toggle-btn')
      if (existing) existing.remove()
    }
  }, [])

  return null // No renderiza nada directamente, solo inyecta en el DOM
}

/**
 * Componente interno que renderiza el contenido de UserInfo
 * Separado para permitir re-renderizado con React
 */
const UserInfoContent = ({ username, role, hospital }) => {
  return (
    <>
      <div style={{ 
        borderTop: '1px solid #E8E8ED', 
        marginBottom: '10px' 
      }} />
      <div style={{ padding: '0 24px' }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#2B3445',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}>
          {username}
        </div>
        <div style={{
          fontSize: '14px',
          color: '#5B6B79',
          fontWeight: 500,
          lineHeight: 1.4,
        }}>
          {role}{hospital ? ` | ${hospital}` : ''}
        </div>
      </div>
      <div style={{ 
        padding: '10px 0',
        borderBottom: '1px solid #E8E8ED',
        marginBottom: '16px',
        background: '#fff'
      }} />
    </>
  )
}

/**
 * Actualizar UserInfo existente (cuando cambia el usuario sin desmontar)
 */
const updateExistingUserInfo = (container, username, role, hospital) => {
  if (!container._reactRoot) return
  container._reactRoot.render(
    <UserInfoContent 
      username={username}
      role={role}
      hospital={hospital}
    />
  )
}

export default UserInfo
