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
router.get('/', authenticateJWT, heavyEndpointsLimiter, async (req, res) => {
  // ✅ TIMEOUT: Configurado desde config/env.js
  res.setTimeout(config.heavyQueryTimeout);
  
  try {
    const sigla = req.query.sigla;
    const periodo = req.query.periodo;
    
    // ✅ VALIDACIÓN: Requerida y con formato
    if (!sigla) {
      return res.status(400).json({ error: 'Se requiere el parámetro sigla', data: null });
    }
    
    // ✅ VALIDACIÓN: Formato de sigla (2-10 caracteres alfanuméricos mayúsculas)
    if (!/^[A-Z0-9]{2,10}$/.test(sigla)) {
      return res.status(400).json({ error: 'Formato de sigla inválido (esperado: 2-10 caracteres alfanuméricos)', data: null });
    }
    
    // ✅ VALIDACIÓN: Formato de periodo si está presente (YYYY-MM)
    if (periodo && !/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Formato de periodo inválido (esperado: YYYY-MM)', data: null });
    }
    
    // === 1. CONSULTAR ESTRUCTURA DEL ORGANIGRAMA ===
    const rows = await AppDataSource.query(
      `SELECT lvl, tipo, codigo_reparticion as cod_rep, desc_rep, sigla, padre, 
              path, path_nombres, regimen_empleo 
       FROM organigramas 
       WHERE sigla = ? 
       ORDER BY lvl, codigo_reparticion`,
      [sigla]
    );

    if (!rows || rows.length === 0) {
      return res.json({ error: `No se encontró organigrama para la sigla: ${sigla}`, data: null });
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
    let personasMap = {};
    
    if (periodo) {

      const personas = await AppDataSource.query(`
        SELECT
          r.codigo_reparticion,
          p.nombre_apellido,
          r.literal_puesto,
          r.codigo_registro,
          r.unificador_puesto
        FROM roles r
        INNER JOIN personas p
          ON r.id_persona = p.id_persona
          AND r.periodo = p.periodo
        INNER JOIN siglas s
          ON r.id_sigla = s.id_sigla
        INNER JOIN organigramas o
          ON o.codigo_reparticion = r.codigo_reparticion COLLATE utf8mb4_unicode_ci
          AND o.sigla COLLATE utf8mb4_unicode_ci = s.sigla COLLATE utf8mb4_unicode_ci
        WHERE
          s.sigla = ?
          AND r.periodo = ?
          AND r.situacion_revista = 'Activo'

          AND (
            -- 🔹 CÓDIGO 25 – AUTORIDADES SUPERIORES
            (
              r.codigo_registro = '25'
              AND r.unificador_puesto = 'Autoridades Superiores'
            )

            OR

            -- 🔹 CÓDIGO 60 – GERENCIA
            (
              r.codigo_registro = '60'
              AND r.unificador_puesto IN ('Gerente', 'Subgerente')
            )

            OR

            -- 🔹 CÓDIGO 37 – JEFATURAS / DIRECCIÓN MÉDICA
            (
              r.codigo_registro = '37'
              AND r.unificador_puesto IN (
                'CPH de Planta',
                'CPH de Guardia',
                'Director/a Medico/a',
                'Subdirector/a Medico/a',
                'Jefe/a de DEPARTAMENTO',
                'Jefe/a de DIVISION',
                'Jefe/a de UNIDAD',
                'Jefe/a de SECCION'
              )
              AND r.j_categoria IS NOT NULL
              AND r.j_categoria != ''
              AND r.j_categoria != '0'
            )

            OR

            -- 🔹 CÓDIGOS 83 / 85 / 87 – JEFATURAS OPERATIVAS
            (
              r.codigo_registro IN ('83', '85', '87')
              AND r.unificador_puesto IN (
                'Administrativo/a',
                'Enfermero/a',
                'Servicios Generales',
                'Tecnico/a de la salud'
              )
              AND r.j_categoria IS NOT NULL
              AND r.j_categoria != ''
              AND r.j_categoria != '0'
            )
          )
        ORDER BY
          r.codigo_reparticion,
          r.codigo_registro,
          r.unificador_puesto;
      `, [sigla, periodo]);
      
      // Crear mapa: una sola persona por nodo (la primera encontrada)
      personas.forEach(p => {
        if (!personasMap[p.codigo_reparticion]) {
          personasMap[p.codigo_reparticion] = {
            nombre: p.nombre_apellido,
            cargo: p.literal_puesto
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

    // === 4. IDENTIFICAR SDHOS (PARA AGRUPACIÓN POR RÉGIMEN) ===
    // Solo se agrupa por régimen si el SDHOS es específicamente "Subdirección Médica"
    let sdhosCod = null;
    rows.forEach(r => {
      if (r.tipo === 'SDHOS' && r.desc_rep && r.desc_rep.includes('Subdirección Médica')) {
        sdhosCod = r.cod_rep;
      }
    });

    // === 5. ARMAR RELACIONES PADRE-HIJO ===
    let raiz = null;
    rows.forEach(r => {
      if (r.padre && mapa[r.padre]) {
        mapa[r.padre].children.push(mapa[r.cod_rep]);
      } else {
        raiz = mapa[r.cod_rep];
      }
    });

    if (!raiz) {
      return res.status(404).json({ error: `No se encontró nodo raíz para el hospital ${sigla}`, data: null });
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

    res.json({ data: raiz, sigla });
    
  } catch (error) {
    logger.error('[GET /api/organigrama] Error:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message, data: null });
  }
});

module.exports = router;
