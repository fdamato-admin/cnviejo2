import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';

const ESTADOS_COLOR = {
  pendiente:  { bg: '#fff4e0', color: '#a15c00' },
  cotizada:   { bg: '#e8f0fe', color: '#2a78d6' },
  aprobada:   { bg: '#e8f6ec', color: '#1a7a3c' },
  convertida: { bg: '#f0f0f0', color: '#555' },
  cancelada:  { bg: '#fff0f0', color: '#c00' },
};

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

export default function CotizacionesInsumos() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [aprobados, setAprobados] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [esAdmin, setEsAdmin] = useState(false);
  const [comparador, setComparador] = useState(null); // { nro_solicitud, data }
  const [cargandoComp, setCargandoComp] = useState(false);

  useEffect(() => {
    API.get('/auth/me').then(res => {
      const permisos = res.data.permisos || [];
      const admin = permisos.some(p => p.modulo === '*' && p.nivel === 'admin');
      setEsAdmin(admin);
    }).catch(() => setEsAdmin(false));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await API.get('/solicitudes-insumos/');
      const data = filtroEstado ? res.data.filter(c => c.estado === filtroEstado) : res.data;
      setLista(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  // Agrupar por nro_solicitud para saber cuales tienen comparador
  const gruposPorNro = lista.reduce((acc, c) => {
    if (c.nro_solicitud) {
      acc[c.nro_solicitud] = (acc[c.nro_solicitud] || 0) + 1;
    }
    return acc;
  }, {});

  const abrirDetalle = (cot) => {
    const ini = {};
    (cot.items || []).forEach(it => { ini[it.id] = !!it.aprobado; });
    setAprobados(ini);
    setAviso('');
    setDetalle(cot);
  };

  const toggleItem = (id) => setAprobados(prev => ({ ...prev, [id]: !prev[id] }));

  const aprobarItems = async () => {
    setGuardando(true);
    setAviso('');
    try {
      const idsAprobados = Object.keys(aprobados).filter(id => aprobados[id]).map(Number);
      await API.patch(`/solicitudes-insumos/${detalle.id}/aprobar-items`, { item_ids: idsAprobados });
      setAviso('Items aprobados guardados.');
      await cargar();
      const res = await API.get('/solicitudes-insumos/');
      const nuevo = res.data.find(c => c.id === detalle.id);
      if (nuevo) setDetalle(nuevo);
    } catch (e) {
      setAviso('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const convertirCompra = async () => {
    if (!window.confirm('Convertir esta cotizacion en orden de compra? Se registrara en Compras y el estado cambiara a convertida.')) return;
    setGuardando(true);
    setAviso('');
    try {
      await API.patch(`/solicitudes-insumos/${detalle.id}/convertir-compra`);
      setAviso('Convertida y registrada en Compras.');
      setDetalle(null);
      cargar();
    } catch (e) {
      setAviso('Error al convertir.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCotizacion = async (id) => {
    if (!window.confirm('Eliminar esta cotizacion definitivamente? Esta accion no se puede deshacer.')) return;
    try {
      await API.delete(`/solicitudes-insumos/${id}`);
      setDetalle(null);
      cargar();
    } catch (e) {
      alert('Error al eliminar. Verifica tu sesion de administrador.');
    }
  };

  const abrirComparador = async (nro) => {
    setCargandoComp(true);
    setComparador({ nro_solicitud: nro, data: null });
    try {
      const res = await API.get(`/solicitudes-insumos/comparar/${nro}`);
      setComparador({ nro_solicitud: nro, data: res.data });
    } catch (e) {
      setComparador({ nro_solicitud: nro, data: null, error: 'Error al cargar comparador.' });
    } finally {
      setCargandoComp(false);
    }
  };

  const hayAprobados = Object.values(aprobados).some(Boolean);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Cotizaciones de Insumos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
            {lista.length} cotizacion{lista.length !== 1 ? 'es' : ''} recibida{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="cotizada">Cotizada</option>
          <option value="aprobada">Aprobada</option>
          <option value="convertida">Convertida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>No hay cotizaciones recibidas aun</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Los proveedores envian cotizaciones desde el enlace generado en la solicitud</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Nro. Sol.', 'Fecha', 'Proveedor', 'Telefono', 'Obra', 'Subtotal USD', 'IVA', 'Total USD', 'Estado', ''].map(h => (
                  <th key={h || 'acc'} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((c, i) => {
                const tieneComparador = c.nro_solicitud && gruposPorNro[c.nro_solicitud] > 1;
                return (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 14px' }}>
                      {c.nro_solicitud ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#1a3a5c', background: '#e8f0fe', padding: '2px 8px', borderRadius: 6 }}>
                            #{c.nro_solicitud}
                          </span>
                          {tieneComparador && (
                            <button
                              onClick={() => abrirComparador(c.nro_solicitud)}
                              title="Comparar precios de proveedores para esta solicitud"
                              style={{ padding: '3px 10px', background: '#ff8c00', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              Comparar
                            </button>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>
                      {c.creado_en ? c.creado_en.slice(0, 10) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.proveedor_nombre || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{c.proveedor_telefono || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{c.obra || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a3a5c' }}>{fmt(c.subtotal_usd)}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{c.iva_usd ? fmt(c.iva_usd) : '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1a7a3c' }}>{fmt(c.total_usd)}</td>
                    <td style={{ padding: '10px 14px' }}><Badge estado={c.estado} /></td>
                    <td style={{ padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => abrirDetalle(c)}
                        style={{ padding: '5px 14px', border: '1px solid #2a78d6', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#2a78d6', fontWeight: 500 }}>
                        Ver
                      </button>
                      {esAdmin && (
                        <button onClick={() => eliminarCotizacion(c.id)}
                          style={{ padding: '5px 10px', border: '1px solid #c00', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#c00', fontWeight: 500 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL COMPARADOR */}
      {comparador && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 1000, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Comparador de Precios — Solicitud #{comparador.nro_solicitud}
                </h2>
                {comparador.data && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
                    {comparador.data.proveedores.length} proveedor{comparador.data.proveedores.length !== 1 ? 'es' : ''} cotizaron esta solicitud
                  </p>
                )}
              </div>
              <button onClick={() => setComparador(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
            </div>

            {cargandoComp && <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>Cargando comparador...</p>}
            {comparador.error && <p style={{ textAlign: 'center', color: '#c00', padding: 20 }}>{comparador.error}</p>}

            {comparador.data && !cargandoComp && (
              <>
                {/* Encabezado con proveedores */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                  {comparador.data.proveedores.map((p, i) => (
                    <span key={i} style={{ background: PROV_COLORS[i % PROV_COLORS.length].bg, color: PROV_COLORS[i % PROV_COLORS.length].color, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                      {i + 1}. {p || 'Sin nombre'}
                    </span>
                  ))}
                </div>

                {/* Tabla comparativa */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3a5c', color: '#fff' }}>
                        <th style={{ ...thS, color: '#fff', borderBottom: 'none', background: 'transparent' }}>Descripción del producto</th>
                        {comparador.data.proveedores.map((p, i) => (
                          <th key={i} style={{ ...thS, color: '#fff', borderBottom: 'none', background: 'transparent', textAlign: 'center' }}>
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
                            if (!oferta) {
                              return <td key={pi} style={{ ...tdS, textAlign: 'center', color: '#ccc' }}>—</td>;
                            }
                            const esMejor = oferta.es_mejor_precio && oferta.precio_usd !== null;
                            return (
                              <td key={pi} style={{ ...tdS, textAlign: 'center' }}>
                                <div style={{
                                  display: 'inline-block',
                                  background: esMejor ? '#e8f6ec' : '#fff',
                                  border: esMejor ? '2px solid #1a7a3c' : '1px solid #e8e8e8',
                                  borderRadius: 8,
                                  padding: '6px 12px',
                                  minWidth: 90,
                                }}>
                                  {oferta.precio_usd !== null ? (
                                    <>
                                      <div style={{ fontWeight: 700, fontSize: 14, color: esMejor ? '#1a7a3c' : '#333' }}>
                                        ${oferta.precio_usd.toFixed(2)}
                                        {esMejor && <span style={{ marginLeft: 4, fontSize: 11 }}>&#x2714;</span>}
                                      </div>
                                      <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontStyle: 'italic' }}>
                                        Solicitado: {oferta.descripcion}
                                      </div>
                                      {oferta.alternativa && (
                                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Ofrecido: {oferta.alternativa}</div>
                                      )}
                                      {oferta.subtotal_usd !== null && (
                                        <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>Sub: ${oferta.subtotal_usd.toFixed(2)}</div>
                                      )}
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
                  <strong>&#x2714; Mejor precio</strong> — Los precios mas bajos por item aparecen resaltados en verde.
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

      {/* MODAL DETALLE */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 820, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Cotizacion #{detalle.id}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
                  {detalle.obra || 'Sin obra'}{detalle.creado_en ? ' — ' + detalle.creado_en.slice(0, 10) : ''}
                  {detalle.nro_solicitud && (
                    <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 12, background: '#e8f0fe', color: '#2a78d6', padding: '2px 8px', borderRadius: 6 }}>
                      Solicitud #{detalle.nro_solicitud}
                    </span>
                  )}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge estado={detalle.estado} />
                <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>&#x2715;</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px', background: '#f5f7fa', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 14 }}>
              <div><span style={{ color: '#888' }}>Proveedor: </span><strong>{detalle.proveedor_nombre || '—'}</strong></div>
              <div><span style={{ color: '#888' }}>Telefono: </span>{detalle.proveedor_telefono || '—'}</div>
              {detalle.validez && <div><span style={{ color: '#888' }}>Validez: </span>{detalle.validez}</div>}
              {detalle.tiempo_entrega && <div><span style={{ color: '#888' }}>Entrega: </span>{detalle.tiempo_entrega}</div>}
              {detalle.condicion_pago && <div><span style={{ color: '#888' }}>Pago: </span>{detalle.condicion_pago}</div>}
              {detalle.banco && <div><span style={{ color: '#888' }}>Banco: </span>{detalle.banco}</div>}
              {detalle.titular && <div><span style={{ color: '#888' }}>Titular: </span>{detalle.titular}</div>}
              {detalle.cuenta && <div><span style={{ color: '#888' }}>Cuenta: </span>{detalle.cuenta} {detalle.tipo_cuenta ? `(${detalle.tipo_cuenta})` : ''}</div>}
              {detalle.rif && <div><span style={{ color: '#888' }}>RIF/CI: </span>{detalle.rif}</div>}
              {detalle.observaciones_prov && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#888' }}>Obs: </span>{detalle.observaciones_prov}</div>}
            </div>

            <p style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>Selecciona los items que vas a aprobar/comprar:</p>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f5f7fa' }}>
                    {['&#x2713;', '#', 'Descripcion', 'Cant.', 'Unidad', 'Alternativa', 'Precio/u USD', 'Subtotal USD'].map(h => (
                      <th key={h} style={thS} dangerouslySetInnerHTML={{ __html: h }} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(detalle.items || []).map((it, i) => {
                    const sel = !!aprobados[it.id];
                    return (
                      <tr key={it.id} onClick={() => toggleItem(it.id)}
                        style={{ background: sel ? '#edf7ee' : (i % 2 === 0 ? '#fff' : '#fafbfd'), borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                        <td style={tdS}><input type="checkbox" checked={sel} onChange={() => toggleItem(it.id)} onClick={e => e.stopPropagation()} style={{ width: 16, height: 16 }} /></td>
                        <td style={tdS}>{i + 1}</td>
                        <td style={{ ...tdS, fontWeight: 500 }}>{it.descripcion || '—'}</td>
                        <td style={tdS}>{it.cantidad || '—'}</td>
                        <td style={tdS}>{it.unidad || '—'}</td>
                        <td style={{ ...tdS, color: '#666' }}>{it.alternativa || '—'}</td>
                        <td style={{ ...tdS, fontWeight: 600 }}>{fmt(it.precio_usd)}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: '#1a7a3c' }}>{fmt(it.subtotal_usd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'right', background: '#1a3a5c', color: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Subtotal USD</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(detalle.subtotal_usd)}</div>
              {detalle.iva_usd > 0 && (
                <>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>IVA 16%</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{fmt(detalle.iva_usd)}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>TOTAL CON IVA</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(detalle.total_usd)}</div>
                </>
              )}
            </div>

            {aviso && (
              <p style={{ fontSize: 13, color: aviso.includes('Error') ? '#c00' : '#1a7a3c', marginBottom: 16, textAlign: 'center' }}>{aviso}</p>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {esAdmin && detalle.estado !== 'convertida' && (
                  <button onClick={() => eliminarCotizacion(detalle.id)} disabled={guardando}
                    style={{ padding: '10px 18px', background: '#fff', color: '#c00', border: '1px solid #c00', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                    Eliminar cotizacion
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => setDetalle(null)}
                  style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button onClick={aprobarItems} disabled={guardando || !hayAprobados}
                  style={{ padding: '10px 22px', background: hayAprobados ? '#2a78d6' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: hayAprobados ? 'pointer' : 'not-allowed', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : 'Guardar items aprobados'}
                </button>
                {detalle.estado !== 'convertida' && detalle.estado !== 'cancelada' && (
                  <button onClick={convertirCompra} disabled={guardando}
                    style={{ padding: '10px 22px', background: '#1a7a3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                    Convertir en compra
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thS = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', fontSize: 13 };
const tdS = { padding: '10px 12px', verticalAlign: 'middle' };
const PROV_COLORS = [
  { bg: '#e8f0fe', color: '#2a78d6' },
  { bg: '#fce8e6', color: '#c0392b' },
  { bg: '#e8f6ec', color: '#1a7a3c' },
  { bg: '#fff4e0', color: '#a15c00' },
  { bg: '#f3e8fe', color: '#6c3fc5' },
];
