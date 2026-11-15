import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import SuministroForm from './SuministroForm';
import PedidosSuministros from './PedidosSuministros';
import ImpactoRecibo from './ImpactoRecibo';
import CotizacionesInsumos from './CotizacionesInsumos';
import FacturaCompraForm from './FacturaCompraForm';

const CATEGORIAS = [
  'QuÃ­micos de piscina', 'Equipos de piscina', 'JardinerÃ­a y Ã¡reas verdes',
  'Electricidad', 'PlomerÃ­a / FontanerÃ­a', 'Planta elÃ©ctrica',
  'Seguridad / Vigilancia', 'Pintura e impermeabilizaciÃ³n',
  'FerreterÃ­a y materiales', 'Limpieza', 'Aire acondicionado',
  'InformÃ¡tica y tecnologÃ­a', 'Otro',
];

function formatFecha(fecha) {
  if (!fecha) return 'â€”';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function formatPrecio(precio, moneda) {
  if (!precio && precio !== 0) return 'â€”';
  const simbolo = moneda === 'Euros' ? 'â‚¬' : moneda === 'USDT' ? 'USDT ' : '$';
  return `${simbolo}${parseFloat(precio).toFixed(2)}`;
}

function formatTotal(s) {
  if (s.monto_total_bs || s.monto_total_bs === 0) {
    if (s.monto_total_bs !== null) return formatBs(s.monto_total_bs);
  }
  if (s.monto_total_divisa || s.monto_total_divisa === 0) {
    if (s.monto_total_divisa !== null) return formatPrecio(s.monto_total_divisa, s.moneda_pago);
  }
  return 'â€”';
}

function formatBs(valor) {
  if (!valor && valor !== 0) return 'â€”';
  return `Bs ${Number(valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDocumento(s) {
  if (!s.tipo_documento) return 'â€”';
  if (s.tipo_documento === 'Otro') return s.documento_otro || 'Otro';
  return s.tipo_documento;
}

export default function Suministros() {
  const [vista, setVista] = useState('compras');
  const [pedidoACompra, setPedidoACompra] = useState(null);
  const comprarPedido = (p) => { setPedidoACompra(p); setVista('compras'); };
  const pestana = (id, texto) => (
    <button onClick={() => setVista(id)}
      style={{
        padding: '10px 20px', border: 'none', background: 'none', fontSize: 14, cursor: 'pointer',
        fontWeight: vista === id ? 600 : 400, color: vista === id ? '#2a78d6' : '#666',
        borderBottom: vista === id ? '2px solid #2a78d6' : '2px solid transparent',
      }}>
      {texto}
    </button>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, padding: '0 32px', borderBottom: '1px solid #eee', maxWidth: 1300, margin: '0 auto' }}>
        {pestana('compras', 'Compras')}
        {pestana('pedidos', 'Pedido de Suministros')}
        {pestana('impacto', 'Impacto Gastos en el Recibo')}
        {pestana('cotizaciones', 'Cotizaciones Recibidas')}
      </div>
      {vista === 'compras' && <Compras pedido={pedidoACompra} onPedidoUsado={() => setPedidoACompra(null)} />}
      {vista === 'pedidos' && <PedidosSuministros onComprar={comprarPedido} />}
      {vista === 'impacto' && <ImpactoRecibo />}
      {vista === 'cotizaciones' && <CotizacionesInsumos />}
      {avisoGuardado && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1a7a3c', color: '#fff', padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 2000, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
          {avisoGuardado}
        </div>
      )}

      {modalFactura && (
        <FacturaCompraForm
          onClose={() => setModalFactura(false)}
          onGuardado={(msg) => { setAvisoGuardado(msg); setTimeout(() => setAvisoGuardado(''), 4000); cargarDatos(); }}
        />
      )}
    </div>
  );
}

function Compras({ pedido, onPedidoUsado }) {
  const [suministros, setSuministros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalFactura, setModalFactura] = useState(false);
  const [avisoGuardado, setAvisoGuardado] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (buscar) params.buscar = buscar;
      if (categoria) params.categoria = categoria;
      const res = await API.get('/suministros/', { params });
      setSuministros(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [buscar, categoria]);

  useEffect(() => { cargar(); }, [cargar]);

  const [orden, setOrden] = useState({ campo: 'nombre', dir: 'asc' });

  const cambiarOrden = (campo) => {
    setOrden(o => o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: campo === 'ultima_fecha_compra' ? 'desc' : 'asc' });
  };

  const ordenados = [...suministros].sort((a, b) => {
    const va = a[orden.campo];
    const vb = b[orden.campo];
    const aVacio = va === null || va === undefined || va === '';
    const bVacio = vb === null || vb === undefined || vb === '';
    if (aVacio && bVacio) return 0;
    if (aVacio) return 1;
    if (bVacio) return -1;
    const r = String(va).localeCompare(String(vb), 'es');
    return orden.dir === 'asc' ? r : -r;
  });

  const abrirNuevo = () => { setSeleccionado(null); setModalAbierto(true); };
  const abrirEditar = (s) => { setSeleccionado(s); setModalAbierto(true); };
  const cerrarModal = () => {
    setModalAbierto(false);
    setSeleccionado(null);
    if (onPedidoUsado) onPedidoUsado();
    cargar();
  };

  useEffect(() => {
    if (pedido) { setSeleccionado(null); setModalAbierto(true); }
  }, [pedido]);

  const marcarRecibido = async (s) => {
    try {
      await API.put(`/suministros/${s.id}`, { estado_recepcion: 'Recibido' });
      cargar();
    } catch (e) {
      console.error(e);
    }
  };

  const eliminar = async (id) => {
    try {
      await API.delete(`/suministros/${id}`);
      setConfirmEliminar(null);
      cargar();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1300, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Compras y Suministros</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
            {suministros.length} suministro{suministros.length !== 1 ? 's' : ''} registrado{suministros.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={abrirNuevo}
            style={{ padding: '10px 20px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + Ingresar compra
          </button>
          <button onClick={() => setModalFactura(true)}
            style={{ padding: '10px 20px', background: '#1a7a3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + Factura / Nota de entrega
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar suministro o proveedor..."
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        />
        <select value={categoria} onChange={e => setCategoria(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, minWidth: 180 }}>
          <option value="">Todas las categorÃ­as</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : suministros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>No hay suministros registrados</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Presiona "Ingresar compra" para agregar el primero</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {[
                  { t: 'Nombre', k: 'nombre' },
                  { t: 'CategorÃ­a', k: 'categoria' },
                  { t: 'Unidad' },
                  { t: 'Cantidad' },
                  { t: 'Proveedor' },
                  { t: 'Fecha de compra', k: 'ultima_fecha_compra' },
                  { t: 'Pagado en' },
                  { t: 'Precio unit.' },
                  { t: 'Total' },
                  { t: 'Documento' },
                  { t: 'RecepciÃ³n' },
                  { t: '' },
                ].map(h => (
                  <th key={h.t || 'acciones'}
                    onClick={h.k ? () => cambiarOrden(h.k) : undefined}
                    title={h.k ? 'Clic para ordenar' : undefined}
                    style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', cursor: h.k ? 'pointer' : 'default', userSelect: 'none' }}>
                    {h.t}{h.k && orden.campo === h.k ? (orden.dir === 'asc' ? ' â–²' : ' â–¼') : (h.k ? ' â†•' : '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.nombre}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: '#e8f0fe', color: '#2a78d6', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {s.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{s.unidad || 'â€”'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{s.cantidad ?? 'â€”'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{s.proveedor || 'â€”'}</td>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{formatFecha(s.ultima_fecha_compra)}</td>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{s.moneda_pago || 'â€”'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: s.ultimo_precio ? '#1a7a3c' : '#aaa', whiteSpace: 'nowrap' }}>
                    {formatPrecio(s.ultimo_precio, s.moneda_pago)}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: formatTotal(s) !== 'â€”' ? '#1a7a3c' : '#aaa', whiteSpace: 'nowrap' }}>
                    {formatTotal(s)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{formatDocumento(s)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    {s.estado_recepcion ? (
                      <span style={{
                        background: s.estado_recepcion === 'Recibido' ? '#e8f6ec' : '#fff4e0',
                        color: s.estado_recepcion === 'Recibido' ? '#1a7a3c' : '#a15c00',
                        padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      }}>{s.estado_recepcion}</span>
                    ) : 'â€”'}
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    {s.estado_recepcion === 'Por recibir' && (
                      <button onClick={() => marcarRecibido(s)}
                        style={{ marginRight: 8, padding: '5px 12px', border: '1px solid #bfe3c9', borderRadius: 6, background: '#f3fbf5', fontSize: 13, cursor: 'pointer', color: '#1a7a3c' }}>
                        Marcar recibido
                      </button>
                    )}
                    <button onClick={() => abrirEditar(s)}
                      style={{ marginRight: 8, padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#444' }}>
                      Editar
                    </button>
                    <button onClick={() => setConfirmEliminar(s)}
                      style={{ padding: '5px 12px', border: '1px solid #fcc', borderRadius: 6, background: '#fff8f8', fontSize: 13, cursor: 'pointer', color: '#c00' }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal formulario */}
      {modalAbierto && (
        <SuministroForm
          suministro={seleccionado}
          inicial={pedido && !seleccionado ? { nombre: pedido.nombre, cantidad: pedido.cantidad, unidad: pedido.unidad || '' } : null}
          pedidoId={pedido && !seleccionado ? pedido.id : null}
          onClose={cerrarModal}
        />
      )}

      {/* Confirm eliminar */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>Â¿Eliminar suministro?</h3>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>
              Se eliminarÃ¡ <strong>{confirmEliminar.nombre}</strong>. Esta acciÃ³n no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmEliminar(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmEliminar.id)}
                style={{ padding: '10px 20px', background: '#c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {avisoGuardado && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1a7a3c', color: '#fff', padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 2000, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
          {avisoGuardado}
        </div>
      )}

      {modalFactura && (
        <FacturaCompraForm
          onClose={() => setModalFactura(false)}
          onGuardado={(msg) => { setAvisoGuardado(msg); setTimeout(() => setAvisoGuardado(''), 4000); cargarDatos(); }}
        />
      )}
    </div>
  );
}
