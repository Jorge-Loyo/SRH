// Routes para organigramas
const express = require('express');
const router = express.Router();
const { AppDataSource } = require('../config/data-source');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { authenticateJWT } = require('../middlewares/auth');
const { heavyEndpointsLimiter } = require('../middlewares/rateLimiters');

/**
 * GET /api/organigrama
 * 
 * Devuelve el árbol de organigrama filtrado por sigla respetando la estructura PADRE-HIJO
 * Incluye personas asignadas (cargos de liderazgo) cuando se especifica un periodo
 * 
 * Query Params:
 * - sigla (requerido): Código del hospital (ej: HGACA, HGARM, etc.)
 * - periodo (opcional): Periodo en formato YYYY-MM para obtener personas asignadas
 * 
 * Filtros de Personas (cuando se especifica periodo):
 * - Cruza roles, personas, siglas y organigramas para validar nodos
 * - situacion_revista = 'Activo' (personal en revista activa)
 * - Código 25 (Autoridades Superiores) OR
 * - Código 60 (Gerencia: Gerente, Subgerente) OR
 * - Código 37 (Jefaturas: con j_categoria no vacía) OR
 * - Códigos 83/85/87 (Jefaturas Operativas: con j_categoria no vacía)
 * 
 * Features:
 * - Validación contra tabla organigramas
 * - Agrupación automática por régimen de empleo bajo SDHOS
 * - Ordenamiento jerárquico por tipo de unidad organizativa
 * - Una persona por nodo según codigo_reparticion
 * - Nodos sin persona asignada se marcan como VACANTE en el frontend
 * 
 * OPTIMIZACIÓN: 
 * - Rate limiting aplicado (endpoint costoso con múltiples JOINs)
 * - Autenticación requerida (JWT)
 * - Timeout configurado desde environment
 */
// Valor de universo_totalizador que identifica cada sección estructural de la BD
const SECCION_UNIVERSOS = {
  'nivel-central':     'NIVEL CENTRAL',
  'atencion-primaria': 'ATENCION PRIMARIA',
};

router.get('/', authenticateJWT, heavyEndpointsLimiter, async (req, res) => {
  // ✅ TIMEOUT: Configurado desde config/env.js
  res.setTimeout(config.heavyQueryTimeout);
  
  try {
    const sigla = req.query.sigla;
    const seccion = req.query.seccion;
    const periodo = req.query.periodo;

    if (!sigla && !seccion) {
      return res.status(400).json({ error: 'Se requiere sigla o seccion', data: null });
    }
    if (sigla && !/^[A-Z0-9]{2,10}$/.test(sigla)) {
      return res.status(400).json({ error: 'Formato de sigla inválido (esperado: 2-10 caracteres alfanuméricos)', data: null });
    }
    if (seccion && !SECCION_UNIVERSOS[seccion]) {
      return res.status(400).json({ error: `Sección inválida. Valores: ${Object.keys(SECCION_UNIVERSOS).join(', ')}`, data: null });
    }
    if (periodo && !/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Formato de periodo inválido (esperado: YYYY-MM)', data: null });
    }

    // === 1. CONSULTAR ESTRUCTURA DEL ORGANIGRAMA ===
    const SQL_COLS = `SELECT lvl, tipo, codigo_reparticion as cod_rep, desc_rep, sigla, padre,
       path, path_nombres, regimen_empleo FROM organigramas`;

    let rows;
    if (sigla) {
      rows = await AppDataSource.query(
        `${SQL_COLS} WHERE sigla = ? ORDER BY lvl, codigo_reparticion`,
        [sigla]
      );
    } else {
      const universo = SECCION_UNIVERSOS[seccion];
      rows = await AppDataSource.query(
        `${SQL_COLS} WHERE universo_totalizador COLLATE utf8mb4_unicode_ci = ? ORDER BY lvl, codigo_reparticion`,
        [universo]
      );
    }

    if (!rows || rows.length === 0) {
      const errMsg = sigla
        ? `No se encontró organigrama para la sigla: ${sigla}`
        : `No se encontró organigrama para la sección: ${seccion}`;
      return res.json({ error: errMsg, data: null });
    }

    // === 2. OBTENER PERSONAS ASIGNADAS ===
    // Obtiene personas con cargos de liderazgo válidos en nodos del organigrama
    // Filtros aplicados:
    // 1. situacion_revista = 'Activo' (personal en situación activa)
    // 2. Cruza con tabla organigramas para validar codigo_reparticion
    // 3. Aplica uno de los siguientes criterios:
    //    a) Código 25: Autoridades Superiores
    //    b) Código 60: Gerencia (Gerente o Subgerente)
    //    c) Código 37: Jefaturas/Dirección Médica (con j_categoria no vacía)
    //    d) Códigos 83/85/87: Jefaturas Operativas (con j_categoria no vacía)
    // Resultado: Una persona por nodo (la primera del ordenamiento)
    // Condición AND compartida para filtrar solo cargos de conducción/jefatura
    const CONDICION_CARGOS = `
          AND (
            (r.codigo_registro = '25' AND r.unificador_puesto = 'Autoridades Superiores')
            OR (r.codigo_registro = '60' AND r.unificador_puesto IN ('Gerente', 'Subgerente'))
            OR (
              r.codigo_registro = '37'
              AND r.unificador_puesto IN (
                'CPH de Planta','CPH de Guardia','Director/a Medico/a','Subdirector/a Medico/a',
                'Jefe/a de DEPARTAMENTO','Jefe/a de DIVISION','Jefe/a de UNIDAD','Jefe/a de SECCION'
              )
              AND r.j_categoria IS NOT NULL AND r.j_categoria != '' AND r.j_categoria != '0'
            )
            OR (
              r.codigo_registro IN ('83', '85', '87')
              AND r.unificador_puesto IN ('Administrativo/a','Enfermero/a','Servicios Generales','Tecnico/a de la salud')
              AND r.j_categoria IS NOT NULL AND r.j_categoria != '' AND r.j_categoria != '0'
            )
          )`;

    const SQL_PERSONAS_SELECT = `
        SELECT r.codigo_reparticion, p.nombre_apellido, r.literal_puesto,
          r.codigo_registro, r.unificador_puesto, p.fecha_nacimiento,
          p.cuil, p.edad, p.antiguedad, r.cargo_desde, r.cargo_hasta`;

    let personasMap = {};

    if (periodo) {
      let personas;

      if (sigla) {
        personas = await AppDataSource.query(`
        ${SQL_PERSONAS_SELECT}
        FROM roles r
        INNER JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
        INNER JOIN siglas s ON r.id_sigla = s.id_sigla
        INNER JOIN organigramas o
          ON o.codigo_reparticion = r.codigo_reparticion COLLATE utf8mb4_unicode_ci
          AND o.sigla COLLATE utf8mb4_unicode_ci = s.sigla COLLATE utf8mb4_unicode_ci
        WHERE s.sigla = ? AND r.periodo = ? AND r.situacion_revista = 'Activo'
        ${CONDICION_CARGOS}
        ORDER BY r.codigo_reparticion, r.codigo_registro, r.unificador_puesto;
        `, [sigla, periodo]);
      } else {
        // Para secciones se une contra organigramas filtrado por universo_totalizador
        const universo = SECCION_UNIVERSOS[seccion];
        personas = await AppDataSource.query(`
        ${SQL_PERSONAS_SELECT}
        FROM roles r
        INNER JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
        INNER JOIN organigramas o
          ON o.codigo_reparticion = r.codigo_reparticion COLLATE utf8mb4_unicode_ci
          AND o.universo_totalizador COLLATE utf8mb4_unicode_ci = ?
        WHERE r.periodo = ? AND r.situacion_revista = 'Activo'
        ${CONDICION_CARGOS}
        ORDER BY r.codigo_reparticion, r.codigo_registro, r.unificador_puesto;
        `, [universo, periodo]);
      }
      
      // Crear mapa: una sola persona por nodo (la primera encontrada)
      personas.forEach(p => {
        if (!personasMap[p.codigo_reparticion]) {
          personasMap[p.codigo_reparticion] = {
            nombre: p.nombre_apellido,
            cargo: p.literal_puesto,
            fecha_nacimiento: p.fecha_nacimiento,
            cuil: p.cuil,
            edad: p.edad,
            antiguedad: p.antiguedad,
            cargo_desde: p.cargo_desde,
            cargo_hasta: p.cargo_hasta
          };
        }
      });
    }

    // === 3. CONSTRUIR MAPA DE NODOS ===
    const mapa = {};
    rows.forEach(r => {
      mapa[r.cod_rep] = {
        id: r.cod_rep,
        name: r.desc_rep,
        title: r.tipo,
        lvl: r.lvl,
        padre: r.padre,
        regimen_empleo: r.regimen_empleo || 'Sin Régimen',
        persona: personasMap[r.cod_rep] || null,
        children: []
      };
    });

    // === 4. IDENTIFICAR SDHOS (PARA AGRUPACIÓN POR RÉGIMEN, SOLO EN VISTAS DE HOSPITAL) ===
    // El agrupamiento por régimen aplica solo cuando se filtra por sigla de hospital.
    // En secciones (nivel-central, atencion-primaria) el regimen_empleo identifica
    // la sección misma, no es un agrupador interno del árbol.
    let sdhosCod = null;
    if (sigla) {
      rows.forEach(r => {
        if (r.tipo === 'SDHOS' && r.desc_rep && r.desc_rep.includes('Subdirección Médica')) {
          sdhosCod = r.cod_rep;
        }
      });
    }

    // === 5. ARMAR RELACIONES PADRE-HIJO ===
    const rootCandidates = [];
    rows.forEach(r => {
      if (r.padre && mapa[r.padre]) {
        mapa[r.padre].children.push(mapa[r.cod_rep]);
      } else {
        rootCandidates.push(mapa[r.cod_rep]);
      }
    });

    let raiz = null;
    if (rootCandidates.length === 1) {
      raiz = rootCandidates[0];
    } else if (rootCandidates.length > 1) {
      // Si todos los huérfanos comparten el mismo padre (nodo de otra sección, ej. la SS
      // de Atención Primaria que está en Nivel Central), se busca ese nodo ancla en la
      // BD para usarlo como raíz visual del árbol.
      const padreSet = new Set(rootCandidates.map(n => n.padre).filter(p => p && p !== 'ROOT'));
      if (padreSet.size === 1) {
        const anchorCod = [...padreSet][0];
        const anchorRows = await AppDataSource.query(
          `${SQL_COLS} WHERE codigo_reparticion = ?`, [anchorCod]
        );
        if (anchorRows.length) {
          const a = anchorRows[0];
          raiz = {
            id: a.cod_rep,
            name: a.desc_rep,
            title: a.tipo,
            lvl: a.lvl,
            padre: a.padre,
            regimen_empleo: a.regimen_empleo || '',
            persona: personasMap[a.cod_rep] || null,
            children: rootCandidates
          };
        }
      }
      // Fallback: elegir el candidato con el nivel más alto (más ancestral)
      if (!raiz) {
        raiz = rootCandidates.reduce((best, n) => (!best || n.lvl < best.lvl ? n : best), null);
      }
    }

    if (!raiz) {
      const ctxMsg = sigla ? `el hospital ${sigla}` : `la sección ${seccion}`;
      return res.status(404).json({ error: `No se encontró nodo raíz para ${ctxMsg}`, data: null });
    }

    // === 6. AGRUPAR HIJOS DE SDHOS POR RÉGIMEN DE EMPLEO ===
    if (sdhosCod && mapa[sdhosCod]) {
      const sdhos = mapa[sdhosCod];
      const hijosOriginales = sdhos.children;
      
      if (hijosOriginales.length > 0) {
        // Agrupar por régimen
        const gruposRegimen = {};
        hijosOriginales.forEach(hijo => {
          const reg = hijo.regimen_empleo || 'Sin Régimen';
          if (!gruposRegimen[reg]) {
            gruposRegimen[reg] = [];
          }
          gruposRegimen[reg].push(hijo);
        });

        // Crear nodos contenedores por régimen
        const nuevosHijos = [];
        Object.keys(gruposRegimen).sort().forEach(nombreRegimen => {
          const nodosDelRegimen = gruposRegimen[nombreRegimen];
          
          const contenedorRegimen = {
            id: `REGIMEN_${nombreRegimen.replace(/\s+/g, '_')}`,
            name: nombreRegimen,
            title: 'REGIMEN',
            lvl: sdhos.lvl + 1,
            padre: sdhosCod,
            regimen_empleo: nombreRegimen,
            children: nodosDelRegimen
          };
          
          nuevosHijos.push(contenedorRegimen);
        });

        sdhos.children = nuevosHijos;
      }
    }

    // === 7. ORDENAR JERÁRQUICAMENTE ===
    const ordenTipos = {
      'Ministerio': 0,
      'AREA': 1,
      'SSEC/DIREJE': 2,
      'GO': 3,
      'SGO': 4,
      'DG': 5,
      'F/N DG': 6,
      'DHOS': 7,
      'SDHOS': 8,
      'UAI DG': 8.5,
      'F/N DEJE': 8.6,
      'UAI MSTR': 8.7,
      'PLTA TRANS. DOCENTE': 8.8,
      'F/N MSTR - GO': 8.9,
      'REGIMEN': 9,
      'DEPT': 10,
      'DEPT CA': 10.5,
      'DIV': 11,
      'DIV CA': 11.5,
      'UNID': 12,
      'SECCION': 13,
      'SECC': 13,
      'SECCION CA': 13.5
    };

    // Función recursiva para ordenar hijos
    const ordenarHijos = (nodo) => {
      if (!nodo.children || nodo.children.length === 0) return;

      nodo.children.sort((a, b) => {
        const ordenA = ordenTipos[a.title] !== undefined ? ordenTipos[a.title] : 999;
        const ordenB = ordenTipos[b.title] !== undefined ? ordenTipos[b.title] : 999;
        
        if (ordenA !== ordenB) return ordenA - ordenB;
        
        // Mismo tipo: ordenar por código
        return String(a.id || '').localeCompare(String(b.id || ''));
      });

      nodo.children.forEach(hijo => ordenarHijos(hijo));
    };

    ordenarHijos(raiz);

    res.json({ data: raiz, ...(sigla ? { sigla } : { seccion }) });
    
  } catch (error) {
    logger.error('[GET /api/organigrama] Error:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message, data: null });
  }
});

module.exports = router;
