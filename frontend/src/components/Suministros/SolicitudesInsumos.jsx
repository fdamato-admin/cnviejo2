import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';

const BACKEND = 'https://cnviejo2-production-46d5.up.railway.app';
const thS = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', fontSize: 13 };
const thSBlue = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#1a3a5c', borderBottom: '2px solid #c5d8f7', whiteSpace: 'nowrap', fontSize: 13 };
const tdS = { padding: '10px 14px', verticalAlign: 'middle' };
const tdSm = { padding: '10px 12px', verticalAlign: 'middle' };
const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const UNIDADES = ['und','m2','m3','ml','kg','lt','1/2 lt','1/4 lt','galon','1/2 galon','1/4 galon','cunete','garrafa','tambor','bidon','saco','bolsa','rollo','caja','paquete','par','global'];

const ESTADOS_COLOR = {
  pendiente:  { bg: '#fff4e0', color: '#a15c00' },
  cotizada:   { bg: '#e8f0fe', color: '#2a78d6' },
  aprobada:   { bg: '#e8f6ec', color: '#1a7a3c' },
  convertida: { bg: '#f0f0f0', color: '#555' },
  cancelada:  { bg: '#fff0f0', color: '#c00' },
};

const PROV_COLORS = [
  { bg: '#e8f0fe', color: '#2a78d6' },
  { bg: '#fce8e6', color: '#c0392b' },
  { bg: '#e8f6ec', color: '#1a7a3c' },
  { bg: '#fff4e0', color: '#a15c00' },
  { bg: '#f3e8fe', color: '#6c3fc5' },
];

function Badge({ estado }) {
  const s = ESTADOS_COLOR[estado] || { bg: '#eee', color: '#555' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {estado}
    </span>
  );
}

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return '$' + parseFloat(n).toFixed(2);
}

export default function SolicitudesInsumos() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [detalle, setDetalle] = useState(null);       // solicitud abierta en modal
  const [tabDetalle, setTabDetalle] = useState('solicitud'); // 'solicitud' | 'cotizaciones'
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Cotizaciones recibidas (dentro del modal)
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargandoCot, setCargandoCot] = useState(false);
  const [detalleCot, setDetalleCot] = useState(null);
  const [aprobados, setAprobados] = useState({});
  const [guardandoCot, setGuardandoCot] = useState(false);
  const [avisoCot, setAvisoCot] = useState('');
  const [esAdmin, setEsAdmin] = useState(false);
  const [comparador, setComparador] = useState(null);
  const [cargandoComp, setCargandoComp] = useState(false);

  // Edición inline de descripción/alternativa en detalle cotización
  const [editDescCot, setEditDescCot] = useState({}); // { [itemId]: { descripcion, alternativa } }
  const [guardandoDesc, setGuardandoDesc] = useState({}); // { [itemId]: true/false }

  // Convertir pedido en compra
  const [modalConvertir, setModalConvertir] = useState(null); // { pedido, seleccion, proveedor, fecha }
  const [convirtiendoPed, setConvirtiendoPed] = useState(false);
  const [avisoConvertir, setAvisoConvertir] = useState('');

  useEffect(() => {
    API.get('/auth/me').then(res => {
      const permisos = res.data.permisos || [];
      setEsAdmin(permisos.some(p => p.modulo === '*' && p.nivel === 'admin'));
    }).catch(() => setEsAdmin(false));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await API.get('/pedidos-cotizacion/');
      setLista(res.data);
    } catch { } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const mostrarAviso = (msg) => { setAviso(msg); setTimeout(() => setAviso(''), 3500); };

  // ── Enlace proveedor ──────────────────────────────────────────────
  const buildUrl = (p) => {
    const paramsItems = p.items.map(it =>
      `i=${encodeURIComponent((it.descripcion || '') + '|' + (it.cantidad || '') + '|' + (it.unidad || ''))}`
    ).join('&');
    return `${BACKEND}/solicitud?modo=proveedor&obra=${encodeURIComponent(p.obra)}&ref=${encodeURIComponent(p.nro_solicitud)}&${paramsItems}`;
  };

  const copiarEnlace = async (p) => {
    const url = buildUrl(p);
    try { await navigator.clipboard.writeText(url); mostrarAviso('Enlace copiado.'); }
    catch { mostrarAviso('No se pudo copiar: ' + url); }
  };

  const enviarWhatsApp = (p) => {
    const url = buildUrl(p);
    const texto = `Hola, le enviamos la solicitud de cotización #${p.nro_solicitud} para ${p.obra}. Por favor indique precios y disponibilidad:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const enviarEmail = (p) => {
    const url = buildUrl(p);
    const asunto = `Solicitud de Cotización #${p.nro_solicitud} - ${p.obra}`;
    const cuerpo = `Estimado proveedor,\n\nLe enviamos la solicitud de cotización #${p.nro_solicitud} para: ${p.obra}.\n\nPor favor ingrese al siguiente enlace para ver los materiales e indicar precios y disponibilidad:\n${url}\n\nQuedamos a la espera de su respuesta.\n\nSaludos,\nCondominio Náutico Pueblo Viejo II`;
    window.open(`mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`, '_blank');
  };

  // ── Eliminar solicitud ────────────────────────────────────────────
  const eliminar = async (id, nro) => {
    if (!window.confirm(`Eliminar solicitud #${nro}? Esta acción no se puede deshacer.`)) return;
    try {
      await API.delete(`/pedidos-cotizacion/${id}`);
      setDetalle(null);
      cargar();
    } catch { alert('Error al eliminar.'); }
  };

  // ── Edición solicitud ─────────────────────────────────────────────
  const abrirEdicion = (p) => {
    setEditando({
      id: p.id,
      nro_solicitud: p.nro_solicitud,
      obra: p.obra,
      fecha_requerida: p.fecha_requerida || '',
      observaciones: p.observaciones || '',
      items: p.items.map(it => ({ ...it })),
    });
    setDetalle(null);
  };

  const agregarItem = () => setEditando(prev => ({
    ...prev, items: [...prev.items, { descripcion: '', cantidad: '', unidad: 'und' }]
  }));

  const quitarItem = (idx) => setEditando(prev => ({
    ...prev, items: prev.items.filter((_, i) => i !== idx)
  }));

  const cambiarItem = (idx, campo, valor) => setEditando(prev => {
    const items = prev.items.map((it, i) => i === idx ? { ...it, [campo]: valor } : it);
    return { ...prev, items };
  });

  const guardarEdicion = async () => {
    if (!editando.obra.trim()) { alert('Indique la obra.'); return; }
    if (editando.items.filter(it => it.descripcion.trim()).length === 0) { alert('Agregue al menos un ítem.'); return; }
    setGuardando(true);
    try {
      await API.put(`/pedidos-cotizacion/${editando.id}`, {
        nro_solicitud: editando.nro_solicitud,
        obra: editando.obra,
        fecha_requerida: editando.fecha_requerida || null,
        observaciones: editando.observaciones || null,
        items: editando.items.filter(it => it.descripcion.trim()).map(it => ({
          descripcion: it.descripcion, cantidad: it.cantidad, unidad: it.unidad
        })),
      });
      mostrarAviso('Solicitud actualizada.');
      setEditando(null);
      cargar();
    } catch { alert('Error al guardar.'); }
    finally { setGuardando(false); }
  };

  // ── Abrir modal solicitud ─────────────────────────────────────────
  const abrirDetalle = async (p) => {
    setDetalle(p);
    setTabDetalle('solicitud');
    setCotizaciones([]);
    setDetalleCot(null);
    setComparador(null);
  };

  // ── Cargar cotizaciones recibidas para una solicitud ──────────────
  const cargarCotizaciones = useCallback(async (nro) => {
    setCargandoCot(true);
    try {
      const res = await API.get('/solicitudes-insumos/', { params: { nro_solicitud: nro } });
      setCotizaciones(res.data);
    } catch { setCotizaciones([]); }
    finally { setCargandoCot(false); }
  }, []);

  useEffect(() => {
    if (detalle && tabDetalle === 'cotizaciones') {
      cargarCotizaciones(detalle.nro_solicitud);
    }
  }, [detalle, tabDetalle, cargarCotizaciones]);

  // ── Detalle cotización recibida ───────────────────────────────────
  const abrirDetalleCot = (cot) => {
    const ini = {};
    (cot.items || []).forEach(it => { ini[it.id] = !!it.aprobado; });
    setAprobados(ini);
    setAvisoCot('');
    setEditDescCot({});
    setGuardandoDesc({});
    setDetalleCot(cot);
  };

  const toggleItem = (id) => setAprobados(prev => ({ ...prev, [id]: !prev[id] }));

  const aprobarItems = async () => {
    setGuardandoCot(true); setAvisoCot('');
    try {
      const idsAprobados = Object.keys(aprobados).filter(id => aprobados[id]).map(Number);
      await API.patch(`/solicitudes-insumos/${detalleCot.id}/aprobar-items`, { item_ids: idsAprobados });
      setAvisoCot('Items aprobados guardados.');
      const res = await API.get('/solicitudes-insumos/', { params: { nro_solicitud: detalle.nro_solicitud } });
      setCotizaciones(res.data);
      const nuevo = res.data.find(c => c.id === detalleCot.id);
      if (nuevo) setDetalleCot(nuevo);
    } catch { setAvisoCot('Error al guardar.'); }
    finally { setGuardandoCot(false); }
  };

  const convertirCompra = async () => {
    if (!window.confirm('Convertir esta cotización en orden de compra?')) return;
    setGuardandoCot(true); setAvisoCot('');
    try {
      await API.patch(`/solicitudes-insumos/${detalleCot.id}/convertir-compra`);
      setAvisoCot('Convertida y registrada en Compras.');
      setDetalleCot(null);
      cargarCotizaciones(detalle.nro_solicitud);
    } catch { setAvisoCot('Error al convertir.'); }
    finally { setGuardandoCot(false); }
  };

  const eliminarCotizacion = async (id) => {
    if (!window.confirm('Eliminar esta cotización definitivamente?')) return;
    try {
      await API.delete(`/solicitudes-insumos/${id}`);
      setDetalleCot(null);
      cargarCotizaciones(detalle.nro_solicitud);
    } catch { alert('Error al eliminar.'); }
  };

  // ── Comparador ────────────────────────────────────────────────────
  const abrirComparador = async (nro) => {
    setCargandoComp(true);
    setComparador({ nro_solicitud: nro, data: null });
    try {
      const res = await API.get(`/solicitudes-insumos/comparar/${nro}`);
      setComparador({ nro_solicitud: nro, data: res.data });
    } catch { setComparador({ nro_solicitud: nro, data: null, error: 'Error al cargar comparador.' }); }
    finally { setCargandoComp(false); }
  };

  // ── Edición inline descripción/alternativa en detalle cotización ──
  const iniciarEditDesc = (it) => {
    setEditDescCot(prev => ({
      ...prev,
      [it.id]: { descripcion: it.descripcion || '', alternativa: it.alternativa || '' }
    }));
  };

  const cancelarEditDesc = (itemId) => {
    setEditDescCot(prev => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  const guardarDesc = async (itemId) => {
    const vals = editDescCot[itemId];
    if (!vals) return;
    setGuardandoDesc(prev => ({ ...prev, [itemId]: true }));
    try {
      await API.patch(`/solicitudes-insumos/items/${itemId}`, {
        descripcion: vals.descripcion,
        alternativa: vals.alternativa,
      });
      // Actualizar el detalleCot en memoria
      setDetalleCot(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === itemId
          ? { ...it, descripcion: vals.descripcion, alternativa: vals.alternativa }
          : it
        )
      }));
      // También actualizar en cotizaciones (lista de la tab)
      setCotizaciones(prev => prev.map(c => ({
        ...c,
        items: (c.items || []).map(it => it.id === itemId
          ? { ...it, descripcion: vals.descripcion, alternativa: vals.alternativa }
          : it
        )
      })));
      cancelarEditDesc(itemId);
      setAvisoCot('✔ Descripción actualizada');
      setTimeout(() => setAvisoCot(''), 2500);
    } catch {
      setAvisoCot('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardandoDesc(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // ── Abrir modal convertir pedido en compra ────────────────────────
  const abrirConvertir = (p) => {
    const seleccion = {};
    const precios = {};
    const proveedores = {};
    p.items.forEach(it => {
      seleccion[it.id] = true;
      precios[it.id] = '';
      proveedores[it.id] = '';
    });
    setModalConvertir({ pedido: p, seleccion, precios, proveedores, proveedorGlobal: '', fecha: new Date().toISOString().slice(0, 10) });
    setAvisoConvertir('');
    setDetalle(null);
  };

  const ejecutarConvertir = async () => {
    const { pedido, seleccion, precios, proveedores, proveedorGlobal, fecha } = modalConvertir;
    const items = pedido.items
      .filter(it => seleccion[it.id])
      .map(it => ({
        descripcion: it.descripcion,
        cantidad: it.cantidad ? parseFloat(it.cantidad) : null,
        unidad: it.unidad || 'und',
        precio_usd: precios[it.id] ? parseFloat(precios[it.id]) : null,
        proveedor: proveedores[it.id] || proveedorGlobal || null,
      }));
    if (items.length === 0) { setAvisoConvertir('Selecciona al menos un ítem.'); return; }
    setConvirtiendoPed(true); setAvisoConvertir('');
    try {
      await API.post(`/pedidos-cotizacion/${pedido.id}/convertir-compra`, {
        items,
        proveedor: proveedorGlobal || null,
        fecha_compra: fecha,
      });
      setModalConvertir(null);
      mostrarAviso(`✔ ${items.length} ítem${items.length !== 1 ? 's' : ''} registrado${items.length !== 1 ? 's' : ''} en Compras.`);
    } catch (e) {
      setAvisoConvertir('Error al registrar. Intenta de nuevo.');
    } finally { setConvirtiendoPed(false); }
  };

  if (cargando) return <p style={{ padding: 40, textAlign: 'center', color: '#888' }}>Cargando...</p>;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Seguimiento de Cotizaciones</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>{lista.length} solicitud{lista.length !== 1 ? 'es' : ''}</p>
        </div>
        {aviso && <span style={{ background: '#e8f6ec', color: '#1a7a3c', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{aviso}</span>}
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>No hay solicitudes registradas aún</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Selecciona insumos en "Insumos por Comprar" para generar una solicitud.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Nro. Sol.', 'Fecha', 'Obra / Trabajo', 'Ítems', ''].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={tdS}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1a3a5c', background: '#e8f0fe', padding: '3px 10px', borderRadius: 6 }}>
                      #{p.nro_solicitud}
                    </span>
                  </td>
                  <td style={{ ...tdS, color: '#666', whiteSpace: 'nowrap' }}>
                    {p.creado_en ? p.creado_en.slice(0, 10) : '—'}
                  </td>
                  <td style={{ ...tdS, fontWeight: 500 }}>{p.obra}</td>
                  <td style={{ ...tdS, color: '#666' }}>{p.items.length} ítem{p.items.length !== 1 ? 's' : ''}</td>
                  <td style={{ ...tdS, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirDetalle(p)}
                        style={{ padding: '5px 12px', border: '1px solid #2a78d6', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#2a78d6', fontWeight: 500 }}>
                        Ver
                      </button>
                      <button onClick={() => abrirEdicion(p)}
                        style={{ padding: '5px 12px', border: '1px solid #1a7a3c', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#1a7a3c', fontWeight: 500 }}>
                        Editar
                      </button>
                      <button onClick={() => copiarEnlace(p)}
                        title="Copiar enlace"
                        style={{ padding: '5px 10px', border: '1px solid #ff8c00', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#ff8c00' }}>
                        🔗
                      </button>
                      <button onClick={() => enviarWhatsApp(p)}
                        title="Enviar por WhatsApp"
                        style={{ padding: '5px 10px', border: '1px solid #25D366', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#25D366' }}>
                        📱
                      </button>
                      <button onClick={() => enviarEmail(p)}
                        title="Enviar por Email"
                        style={{ padding: '5px 10px', border: '1px solid #2a78d6', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#2a78d6' }}>
                        ✉️
                      </button>
                      <button onClick={() => eliminar(p.id, p.nro_solicitud)}
                        style={{ padding: '5px 10px', border: '1px solid #c00', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#c00' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL VER SOLICITUD ── */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 820, marginBottom: 24 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Solicitud #{detalle.nro_solicitud}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>{detalle.obra}</p>
              </div>
              <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #eee', marginBottom: 20 }}>
              {[['solicitud', '📋 Solicitud enviada'], ['cotizaciones', '📥 Cotizaciones recibidas']].map(([id, label]) => (
                <button key={id} onClick={() => setTabDetalle(id)}
                  style={{ padding: '10px 20px', border: 'none', background: 'none', fontSize: 14, cursor: 'pointer', fontWeight: tabDetalle === id ? 700 : 400, color: tabDetalle === id ? '#2a78d6' : '#666', borderBottom: tabDetalle === id ? '2px solid #2a78d6' : '2px solid transparent', marginBottom: -2 }}>
                  {label}
                </button>
              ))}
            </div>

            {/* TAB: Solicitud enviada */}
            {tabDetalle === 'solicitud' && (
              <>
                {detalle.fecha_requerida && <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Fecha requerida: <strong>{detalle.fecha_requerida}</strong></p>}
                {detalle.observaciones && <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Observaciones: {detalle.observaciones}</p>}

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f7fa' }}>
                      {['#', 'Producto solicitado', 'Cant.', 'Unidad'].map(h => <th key={h} style={thS}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.items.map((it, i) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                        <td style={tdS}>{i + 1}</td>
                        <td style={{ ...tdS, fontWeight: 500 }}>{it.descripcion}</td>
                        <td style={tdS}>{it.cantidad || '—'}</td>
                        <td style={tdS}>{it.unidad || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button onClick={() => enviarWhatsApp(detalle)}
                    style={{ padding: '10px 20px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    📱 WhatsApp
                  </button>
                  <button onClick={() => enviarEmail(detalle)}
                    style={{ padding: '10px 20px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    ✉️ Email
                  </button>
                  <button onClick={() => copiarEnlace(detalle)}
                    style={{ padding: '10px 20px', background: '#ff8c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    🔗 Copiar enlace
                  </button>
                  <button onClick={() => abrirEdicion(detalle)}
                    style={{ padding: '10px 20px', background: '#1a7a3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => abrirConvertir(detalle)}
                    style={{ padding: '10px 20px', background: '#7b2d8b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    🛒 Convertir en compra
                  </button>
                  <button onClick={() => setDetalle(null)}
                    style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                    Cerrar
                  </button>
                </div>
              </>
            )}

            {/* TAB: Cotizaciones recibidas */}
            {tabDetalle === 'cotizaciones' && (
              <>
                {cargandoCot ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: 30 }}>Cargando...</p>
                ) : cotizaciones.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                    <p style={{ fontSize: 15 }}>No hay cotizaciones recibidas aún</p>
                    <p style={{ fontSize: 13, marginTop: 6 }}>Envía el enlace al proveedor desde la pestaña "Solicitud enviada"</p>
                  </div>
                ) : (
                  <>
                    {cotizaciones.length > 1 && (
                      <div style={{ marginBottom: 12, textAlign: 'right' }}>
                        <button onClick={() => abrirComparador(detalle.nro_solicitud)}
                          style={{ padding: '8px 18px', background: '#ff8c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          ⚖️ Comparar precios ({cotizaciones.length} proveedores)
                        </button>
                      </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#e8f0fe' }}>
                            {['Fecha', 'Proveedor', 'Teléfono', 'Subtotal USD', 'IVA', 'Total USD', 'Estado', ''].map(h => (
                              <th key={h || 'acc'} style={thSBlue}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cotizaciones.map((c, i) => (
                            <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                              <td style={{ ...tdSm, color: '#666', whiteSpace: 'nowrap' }}>{c.creado_en ? c.creado_en.slice(0, 10) : '—'}</td>
                              <td style={{ ...tdSm, fontWeight: 500 }}>{c.proveedor_nombre || '—'}</td>
                              <td style={{ ...tdSm, color: '#666' }}>{c.proveedor_telefono || '—'}</td>
                              <td style={{ ...tdSm, fontWeight: 600, color: '#1a3a5c' }}>{fmt(c.subtotal_usd)}</td>
                              <td style={{ ...tdSm, color: '#666' }}>{c.iva_usd ? fmt(c.iva_usd) : '—'}</td>
                              <td style={{ ...tdSm, fontWeight: 700, color: '#1a7a3c' }}>{fmt(c.total_usd)}</td>
                              <td style={tdSm}>
                                <Badge estado={c.estado} />
                                {c.cotizacion_adjunta_url && (
                                  <a href={c.cotizacion_adjunta_url} target="_blank" rel="noreferrer"
                                    title="Ver cotización adjunta" style={{ marginLeft: 6, fontSize: 15, textDecoration: 'none' }}>📎</a>
                                )}
                              </td>
                              <td style={{ ...tdSm, whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => abrirDetalleCot(c)}
                                    style={{ padding: '4px 12px', border: '1px solid #2a78d6', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#2a78d6', fontWeight: 500 }}>
                                    Ver
                                  </button>
                                  {esAdmin && (
                                    <button onClick={() => eliminarCotizacion(c.id)}
                                      style={{ padding: '4px 8px', border: '1px solid #c00', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#c00' }}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <button onClick={() => setDetalle(null)}
                    style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR ── */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 700, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Editar Solicitud #{editando.nro_solicitud}</h2>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Obra / Trabajo</label>
            <input style={{ ...inp, marginBottom: 12 }} value={editando.obra}
              onChange={e => setEditando(prev => ({ ...prev, obra: e.target.value }))} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Fecha requerida</label>
            <input type="date" style={{ ...inp, marginBottom: 12 }} value={editando.fecha_requerida}
              onChange={e => setEditando(prev => ({ ...prev, fecha_requerida: e.target.value }))} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Observaciones</label>
            <textarea style={{ ...inp, marginBottom: 16, minHeight: 60, resize: 'vertical' }} value={editando.observaciones}
              onChange={e => setEditando(prev => ({ ...prev, observaciones: e.target.value }))} />

            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a5c', marginBottom: 8 }}>Materiales</div>
            {editando.items.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 36px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input style={inp} placeholder="Descripción" value={it.descripcion}
                  onChange={e => cambiarItem(idx, 'descripcion', e.target.value)} />
                <input style={inp} placeholder="Cant." type="number" min="0" value={it.cantidad}
                  onChange={e => cambiarItem(idx, 'cantidad', e.target.value)} />
                <select style={inp} value={it.unidad} onChange={e => cambiarItem(idx, 'unidad', e.target.value)}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => quitarItem(idx)}
                  style={{ background: 'none', border: 'none', color: '#e53935', fontSize: 20, cursor: 'pointer', padding: 0 }}>×</button>
              </div>
            ))}
            <button onClick={agregarItem}
              style={{ width: '100%', padding: 10, border: '2px dashed #b0c4de', background: 'none', borderRadius: 8, color: '#1a3a5c', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4, marginBottom: 20 }}>
              + Agregar ítem
            </button>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditando(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={guardando}
                style={{ padding: '10px 24px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE COTIZACIÓN RECIBIDA ── */}
      {detalleCot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 820, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Cotización de {detalleCot.proveedor_nombre || 'Proveedor'}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
                  {detalleCot.obra || ''}{detalleCot.creado_en ? ' — ' + detalleCot.creado_en.slice(0, 10) : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge estado={detalleCot.estado} />
                <button onClick={() => setDetalleCot(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px', background: '#f5f7fa', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 14 }}>
              <div><span style={{ color: '#888' }}>Proveedor: </span><strong>{detalleCot.proveedor_nombre || '—'}</strong></div>
              <div><span style={{ color: '#888' }}>Teléfono: </span>{detalleCot.proveedor_telefono || '—'}</div>
              {detalleCot.validez && <div><span style={{ color: '#888' }}>Validez: </span>{detalleCot.validez}</div>}
              {detalleCot.tiempo_entrega && <div><span style={{ color: '#888' }}>Entrega: </span>{detalleCot.tiempo_entrega}</div>}
              {detalleCot.condicion_pago && <div><span style={{ color: '#888' }}>Pago: </span>{detalleCot.condicion_pago}</div>}
              {detalleCot.banco && <div><span style={{ color: '#888' }}>Banco: </span>{detalleCot.banco}</div>}
              {detalleCot.titular && <div><span style={{ color: '#888' }}>Titular: </span>{detalleCot.titular}</div>}
              {detalleCot.cuenta && <div><span style={{ color: '#888' }}>Cuenta: </span>{detalleCot.cuenta} {detalleCot.tipo_cuenta ? `(${detalleCot.tipo_cuenta})` : ''}</div>}
              {detalleCot.rif && <div><span style={{ color: '#888' }}>RIF/CI: </span>{detalleCot.rif}</div>}
              {detalleCot.observaciones_prov && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#888' }}>Obs: </span>{detalleCot.observaciones_prov}</div>}
            </div>

            <p style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>Selecciona los ítems que vas a aprobar/comprar · <span style={{ color: '#2a78d6' }}>✏️ clic en el nombre para editar</span></p>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f7fa' }}>
                    {['✓', '#', 'Producto solicitado', 'Cant.', 'Unidad', 'Producto ofrecido', 'Precio/u USD', 'Subtotal USD'].map(h => (
                      <th key={h} style={thS}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(detalleCot.items || []).map((it, i) => {
                    const sel = !!aprobados[it.id];
                    const enEdicion = !!editDescCot[it.id];
                    const vals = editDescCot[it.id] || {};
                    const guardando_ = !!guardandoDesc[it.id];
                    return (
                      <tr key={it.id}
                        style={{ background: sel ? '#edf7ee' : (i % 2 === 0 ? '#fff' : '#fafbfd'), borderBottom: '1px solid #eee' }}>
                        <td style={tdS} onClick={() => toggleItem(it.id)} style={{ ...tdS, cursor: 'pointer' }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleItem(it.id)} onClick={e => e.stopPropagation()} style={{ width: 16, height: 16 }} />
                        </td>
                        <td style={{ ...tdS, cursor: 'pointer' }} onClick={() => toggleItem(it.id)}>{i + 1}</td>

                        {/* Producto solicitado — editable */}
                        <td style={{ ...tdS, minWidth: 160 }}>
                          {enEdicion ? (
                            <input autoFocus value={vals.descripcion}
                              onChange={e => setEditDescCot(prev => ({ ...prev, [it.id]: { ...prev[it.id], descripcion: e.target.value } }))}
                              onKeyDown={e => { if (e.key === 'Enter') guardarDesc(it.id); if (e.key === 'Escape') cancelarEditDesc(it.id); }}
                              style={{ ...inp, padding: '4px 8px', fontSize: 13, fontWeight: 600, border: '2px solid #2a78d6' }} />
                          ) : (
                            <span onClick={() => iniciarEditDesc(it)}
                              title="Clic para editar"
                              style={{ fontWeight: 600, cursor: 'text', borderBottom: '1px dashed #bbb', paddingBottom: 1 }}>
                              {it.descripcion || '—'}
                            </span>
                          )}
                        </td>

                        <td style={{ ...tdS, cursor: 'pointer' }} onClick={() => toggleItem(it.id)}>{it.cantidad || '—'}</td>
                        <td style={{ ...tdS, cursor: 'pointer' }} onClick={() => toggleItem(it.id)}>{it.unidad || '—'}</td>

                        {/* Producto ofrecido (alternativa) — editable */}
                        <td style={{ ...tdS, minWidth: 140 }}>
                          {enEdicion ? (
                            <input value={vals.alternativa}
                              onChange={e => setEditDescCot(prev => ({ ...prev, [it.id]: { ...prev[it.id], alternativa: e.target.value } }))}
                              onKeyDown={e => { if (e.key === 'Enter') guardarDesc(it.id); if (e.key === 'Escape') cancelarEditDesc(it.id); }}
                              placeholder="Producto ofrecido"
                              style={{ ...inp, padding: '4px 8px', fontSize: 13, border: '2px solid #2a78d6' }} />
                          ) : (
                            <span onClick={() => iniciarEditDesc(it)}
                              title="Clic para editar"
                              style={{ color: '#666', cursor: 'text', borderBottom: '1px dashed #bbb', paddingBottom: 1 }}>
                              {it.alternativa || <span style={{ color: '#ccc' }}>—</span>}
                            </span>
                          )}
                        </td>

                        <td style={{ ...tdS, fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleItem(it.id)}>{fmt(it.precio_usd)}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: '#1a7a3c', cursor: 'pointer' }} onClick={() => toggleItem(it.id)}>{fmt(it.subtotal_usd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Botones guardar/cancelar edición si hay algún ítem en edición */}
            {Object.keys(editDescCot).length > 0 && (
              <div style={{ background: '#e8f0fe', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#2a78d6', fontWeight: 600 }}>✏️ Editando descripción</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={() => { const id = parseInt(Object.keys(editDescCot)[0]); guardarDesc(id); }}
                    disabled={Object.values(guardandoDesc).some(Boolean)}
                    style={{ padding: '6px 16px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {Object.values(guardandoDesc).some(Boolean) ? 'Guardando...' : '✔ Guardar'}
                  </button>
                  <button onClick={() => setEditDescCot({})}
                    style={{ padding: '6px 14px', border: '1px solid #aaa', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right', background: '#1a3a5c', color: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Subtotal USD</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(detalleCot.subtotal_usd)}</div>
              {detalleCot.iva_usd > 0 && (
                <>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>IVA 16%</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{fmt(detalleCot.iva_usd)}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>TOTAL CON IVA</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(detalleCot.total_usd)}</div>
                </>
              )}
            </div>

            {avisoCot && (
              <p style={{ fontSize: 13, color: avisoCot.includes('Error') ? '#c00' : '#1a7a3c', marginBottom: 16, textAlign: 'center' }}>{avisoCot}</p>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {esAdmin && detalleCot.estado !== 'convertida' && (
                  <button onClick={() => eliminarCotizacion(detalleCot.id)} disabled={guardandoCot}
                    style={{ padding: '10px 18px', background: '#fff', color: '#c00', border: '1px solid #c00', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                    Eliminar cotización
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => setDetalleCot(null)}
                  style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button onClick={aprobarItems} disabled={guardandoCot || !Object.values(aprobados).some(Boolean)}
                  style={{ padding: '10px 22px', background: Object.values(aprobados).some(Boolean) ? '#2a78d6' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: Object.values(aprobados).some(Boolean) ? 'pointer' : 'not-allowed' }}>
                  {guardandoCot ? 'Guardando...' : 'Guardar ítems aprobados'}
                </button>
                {detalleCot.estado !== 'convertida' && detalleCot.estado !== 'cancelada' && (
                  <button onClick={convertirCompra} disabled={guardandoCot}
                    style={{ padding: '10px 22px', background: '#1a7a3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                    Convertir en compra
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONVERTIR EN COMPRA ── */}
      {modalConvertir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1300, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 760, marginBottom: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a3a5c' }}>🛒 Convertir en compra</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>Solicitud #{modalConvertir.pedido.nro_solicitud} · {modalConvertir.pedido.obra}</p>
              </div>
              <button onClick={() => setModalConvertir(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
            </div>

            {/* Proveedor global y fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Proveedor (global)</label>
                <input style={inp} placeholder="Nombre del proveedor"
                  value={modalConvertir.proveedorGlobal}
                  onChange={e => setModalConvertir(prev => ({ ...prev, proveedorGlobal: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Fecha de compra</label>
                <input type="date" style={inp}
                  value={modalConvertir.fecha}
                  onChange={e => setModalConvertir(prev => ({ ...prev, fecha: e.target.value }))} />
              </div>
            </div>

            {/* Tabla de ítems con checkbox y precio */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7b2d8b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Seleccioná los ítems a comprar e ingresá el precio
            </div>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f7fa' }}>
                    <th style={{ ...thS, width: 36 }}>✓</th>
                    <th style={thS}>Producto</th>
                    <th style={{ ...thS, width: 70 }}>Cant.</th>
                    <th style={{ ...thS, width: 70 }}>Unidad</th>
                    <th style={{ ...thS, width: 120 }}>Precio USD</th>
                    <th style={{ ...thS, width: 100 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {modalConvertir.pedido.items.map((it, i) => {
                    const sel = modalConvertir.seleccion[it.id];
                    const precio = parseFloat(modalConvertir.precios[it.id]) || 0;
                    const cant = parseFloat(it.cantidad) || 0;
                    const sub = precio > 0 && cant > 0 ? precio * cant : precio > 0 ? precio : null;
                    return (
                      <tr key={it.id} style={{ background: sel ? (i % 2 === 0 ? '#faf4ff' : '#f4ebff') : (i % 2 === 0 ? '#fff' : '#fafbfd'), borderBottom: '1px solid #eee', opacity: sel ? 1 : 0.5 }}>
                        <td style={{ ...tdS, textAlign: 'center' }}>
                          <input type="checkbox" checked={!!sel}
                            onChange={e => setModalConvertir(prev => ({ ...prev, seleccion: { ...prev.seleccion, [it.id]: e.target.checked } }))}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7b2d8b' }} />
                        </td>
                        <td style={{ ...tdS, fontWeight: 500 }}>{it.descripcion}</td>
                        <td style={{ ...tdS, color: '#666' }}>{it.cantidad || '—'}</td>
                        <td style={{ ...tdS, color: '#666' }}>{it.unidad || '—'}</td>
                        <td style={tdS}>
                          <input type="number" min="0" step="0.01" placeholder="0.00"
                            value={modalConvertir.precios[it.id]}
                            onChange={e => setModalConvertir(prev => ({ ...prev, precios: { ...prev.precios, [it.id]: e.target.value } }))}
                            disabled={!sel}
                            style={{ ...inp, padding: '4px 8px', fontSize: 13, width: 100, textAlign: 'right' }} />
                        </td>
                        <td style={{ ...tdS, fontWeight: 600, color: sub ? '#1a7a3c' : '#ccc' }}>
                          {sub ? '$' + sub.toFixed(2) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total estimado */}
            {(() => {
              const totalEst = modalConvertir.pedido.items
                .filter(it => modalConvertir.seleccion[it.id] && modalConvertir.precios[it.id])
                .reduce((acc, it) => {
                  const p = parseFloat(modalConvertir.precios[it.id]) || 0;
                  const c = parseFloat(it.cantidad) || 1;
                  return acc + p * c;
                }, 0);
              return totalEst > 0 ? (
                <div style={{ background: '#e8f6ec', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14, fontWeight: 700, color: '#1a7a3c', textAlign: 'right' }}>
                  Total estimado: ${totalEst.toFixed(2)} USD
                </div>
              ) : null;
            })()}

            {avisoConvertir && (
              <div style={{ background: '#fff3cd', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#7a5100' }}>
                {avisoConvertir}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalConvertir(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={ejecutarConvertir} disabled={convirtiendoPed}
                style={{ padding: '10px 24px', background: '#7b2d8b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: convirtiendoPed ? 0.7 : 1 }}>
                {convirtiendoPed ? 'Registrando...' : '🛒 Registrar en Compras'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COMPARADOR ── */}
      {comparador && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1300, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 1000, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Comparador de Precios — Solicitud #{comparador.nro_solicitud}</h2>
                {comparador.data && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
                    {comparador.data.proveedores.length} proveedor{comparador.data.proveedores.length !== 1 ? 'es' : ''} cotizaron
                  </p>
                )}
              </div>
              <button onClick={() => setComparador(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
            </div>

            {cargandoComp && <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>Cargando comparador...</p>}
            {comparador.error && <p style={{ textAlign: 'center', color: '#c00', padding: 20 }}>{comparador.error}</p>}

            {comparador.data && !cargandoComp && (
              <>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                  {comparador.data.proveedores.map((p, i) => (
                    <span key={i} style={{ background: PROV_COLORS[i % PROV_COLORS.length].bg, color: PROV_COLORS[i % PROV_COLORS.length].color, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                      {i + 1}. {p || 'Sin nombre'}
                    </span>
                  ))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3a5c', color: '#fff' }}>
                        <th style={{ ...thS, color: '#fff', borderBottom: 'none' }}>Producto solicitado</th>
                        {comparador.data.proveedores.map((p, i) => (
                          <th key={i} style={{ ...thS, color: '#fff', borderBottom: 'none', textAlign: 'center' }}>
                            {p || 'Proveedor ' + (i + 1)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparador.data.items.map((item, rowIdx) => (
                        <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                          <td style={{ ...tdS, fontWeight: 500, maxWidth: 200 }}>{item.descripcion}</td>
                          {comparador.data.proveedores.map((prov, pi) => {
                            const oferta = item.ofertas.find(o => o.proveedor === prov);
                            if (!oferta) return <td key={pi} style={{ ...tdS, textAlign: 'center', color: '#ccc' }}>—</td>;
                            const esMejor = oferta.es_mejor_precio && oferta.precio_usd !== null;
                            return (
                              <td key={pi} style={{ ...tdS, textAlign: 'center' }}>
                                <div style={{ display: 'inline-block', background: esMejor ? '#e8f6ec' : '#fff', border: esMejor ? '2px solid #1a7a3c' : '1px solid #e8e8e8', borderRadius: 8, padding: '6px 12px', minWidth: 90 }}>
                                  {oferta.precio_usd !== null ? (
                                    <>
                                      <div style={{ fontWeight: 700, fontSize: 14, color: esMejor ? '#1a7a3c' : '#333' }}>
                                        ${oferta.precio_usd.toFixed(2)}{esMejor && <span style={{ marginLeft: 4, fontSize: 11 }}>✔</span>}
                                      </div>
                                      {oferta.alternativa && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Ofrecido: {oferta.alternativa}</div>}
                                      {oferta.subtotal_usd !== null && <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>Sub: ${oferta.subtotal_usd.toFixed(2)}</div>}
                                    </>
                                  ) : (
                                    <span style={{ color: '#aaa', fontSize: 12 }}>Sin precio</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#e8f6ec', borderRadius: 8, fontSize: 13, color: '#1a7a3c' }}>
                  <strong>✔ Mejor precio</strong> — Los precios más bajos por ítem aparecen resaltados en verde.
                </div>
              </>
            )}
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={() => setComparador(null)}
                style={{ padding: '10px 24px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
