import React, { useState, useEffect, useRef } from 'react';
import API from '../../api';
import CotizacionForm from './CotizacionForm';

const CLOUD_NAME = 'jnx7eyg1';
const UPLOAD_PRESET = 'cnpv2_unsigned';

const ESTADO_COLOR = {
  pendiente_cotizacion: { bg: '#fff3cd', color: '#856404', label: 'Pendiente cotizacion' },
  cotizaciones_recibidas: { bg: '#cfe2ff', color: '#084298', label: 'Cotizaciones recibidas' },
  aprobado: { bg: '#d1e7dd', color: '#0a3622', label: 'Aprobado' },
  en_ejecucion: { bg: '#d0e4ff', color: '#1a5276', label: 'En ejecucion' },
  completado: { bg: '#d1e7dd', color: '#0a3622', label: 'Completado' },
  cancelado: { bg: '#f8d7da', color: '#842029', label: 'Cancelado' },
};

const ESTADO_COT_COLOR = {
  pendiente: { bg: '#fff3cd', color: '#856404', label: 'Pendiente' },
  recibida: { bg: '#cfe2ff', color: '#084298', label: 'Recibida' },
  aprobada: { bg: '#d1e7dd', color: '#0a3622', label: 'Aprobada' },
  rechazada: { bg: '#f8d7da', color: '#842029', label: 'Rechazada' },
};

const badge = (texto, bg, color) => (
  <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{texto}</span>
);

const FOTO_SLOTS = ['foto1','foto2','foto3','foto4','foto5','foto6'];
const VIDEO_SLOTS = ['video1','video2','video3'];

async function subirCloudinary(file, tipo) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${tipo}/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Error subiendo archivo');
  const data = await res.json();
  return data.secure_url;
}
export default function TrabajoDetalle({ trabajo: trabajoInicial, onClose, onCambio }) {
  const [trabajo, setTrabajo] = useState(trabajoInicial);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cotEditar, setCotEditar] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState({});
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const inputRefs = useRef({});

  const cargar = () => {
    setCargando(true);
    API.get(`/trabajos/${trabajo.id}/cotizaciones`)
      .then(r => setCotizaciones(r.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  const recargarTrabajo = () => {
    API.get(`/trabajos/${trabajo.id}`).then(r => setTrabajo(r.data)).catch(() => {});
  };

  useEffect(() => { cargar(); }, [trabajo.id]);

  const aprobarCotizacion = async (cot) => {
    await API.put(`/trabajos/cotizaciones/${cot.id}`, { estado: 'aprobada' });
    for (const c of cotizaciones) {
      if (c.id !== cot.id && c.tipo === cot.tipo && c.estado !== 'rechazada') {
        await API.put(`/trabajos/cotizaciones/${c.id}`, { estado: 'rechazada' });
      }
    }
    await API.put(`/trabajos/${trabajo.id}`, { estado: 'aprobado' });
    cargar();
    onCambio && onCambio();
  };

  const eliminarCotizacion = async (id) => {
    if (!window.confirm('Eliminar esta cotizacion?')) return;
    await API.delete(`/trabajos/cotizaciones/${id}`);
    cargar();
  };

  const handleSubirFoto = async (slot, file) => {
    if (!file) return;
    setSubiendo(s => ({ ...s, [slot]: true }));
    try {
      const url = await subirCloudinary(file, 'image');
      await API.patch(`/trabajos/${trabajo.id}/media`, { [slot]: url });
      recargarTrabajo();
      onCambio && onCambio();
    } catch (e) {
      alert('Error subiendo foto: ' + e.message);
    } finally {
      setSubiendo(s => ({ ...s, [slot]: false }));
    }
  };

  const handleSubirVideo = async (slot, file) => {
    if (!file) return;
    setSubiendo(s => ({ ...s, [slot]: true }));
    try {
      const url = await subirCloudinary(file, 'video');
      await API.patch(`/trabajos/${trabajo.id}/media`, { [slot]: url });
      recargarTrabajo();
      onCambio && onCambio();
    } catch (e) {
      alert('Error subiendo video: ' + e.message);
    } finally {
      setSubiendo(s => ({ ...s, [slot]: false }));
    }
  };

  const handleEliminarMedia = async (slot) => {
    if (!window.confirm('Eliminar este archivo?')) return;
    await API.patch(`/trabajos/${trabajo.id}/media`, { [slot]: null });
    recargarTrabajo();
    onCambio && onCambio();
  };

  const est = ESTADO_COLOR[trabajo.estado] || {};
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>{trabajo.titulo}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {badge(est.label, est.bg, est.color)}
              {badge(trabajo.categoria, "#f0f0f0", "#333")}
              {badge(trabajo.tipo, "#e8f4fd", "#1a6ca8")}
              {trabajo.prioridad === "urgente" && badge("Urgente", "#fff0f0", "#c00")}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>x</button>
        </div>
        {trabajo.ubicacion && <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>{trabajo.ubicacion}</p>}
        {trabajo.descripcion && <p style={{ fontSize: 14, color: "#444", margin: "0 0 16px", whiteSpace: "pre-wrap" }}>{trabajo.descripcion}</p>}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Fotos (max. 6)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {FOTO_SLOTS.map(slot => { const url = trabajo[slot]; return (
              <div key={slot} style={{ border: "2px dashed #ddd", borderRadius: 10, overflow: "hidden", position: "relative", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" }}>
                {url ? (<><img src={url} alt={slot} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} onClick={() => setVistaPrevia({ url, tipo: "imagen" })} /><button onClick={() => handleEliminarMedia(slot)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(200,0,0,0.8)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, fontSize: 12, cursor: "pointer" }}>x</button></>) : subiendo[slot] ? (<span style={{ fontSize: 12, color: "#888" }}>Subiendo...</span>) : (<button onClick={() => inputRefs.current[slot]?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 24 }}>+ Foto</button>)}
                <input ref={el => inputRefs.current[slot] = el} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleSubirFoto(slot, e.target.files[0])} />
              </div>
            );})}
          </div>
        </div>
        <div style={{ borderTop: "1px solid #eee", paddingTop: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Videos (max. 3)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {VIDEO_SLOTS.map(slot => { const url = trabajo[slot]; return (
              <div key={slot} style={{ border: "2px dashed #ddd", borderRadius: 10, overflow: "hidden", position: "relative", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" }}>
                {url ? (<><video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", cursor: "pointer" }} onClick={() => setVistaPrevia({ url, tipo: "video" })}><span style={{ fontSize: 28, color: "#fff" }}>&#9654;</span><button onClick={e => { e.stopPropagation(); handleEliminarMedia(slot); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(200,0,0,0.8)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, fontSize: 12, cursor: "pointer" }}>x</button></div></>) : subiendo[slot] ? (<span style={{ fontSize: 12, color: "#888" }}>Subiendo...</span>) : (<button onClick={() => inputRefs.current[slot]?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 24 }}>+ Video</button>)}
                <input ref={el => inputRefs.current[slot] = el} type="file" accept="video/*" style={{ display: "none" }} onChange={e => handleSubirVideo(slot, e.target.files[0])} />
              </div>
            );})}
          </div>
        </div>
        <div style={{ borderTop: "1px solid #eee", paddingTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Cotizaciones ({cotizaciones.length})</h3>
            <button onClick={() => { setCotEditar(null); setMostrarForm(true); }} style={{ padding: "6px 16px", background: "#2a78d6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>+ Agregar</button>
          </div>
          {cargando ? <p style={{ color: "#999", fontSize: 13 }}>Cargando...</p> : cotizaciones.length === 0 ? <p style={{ color: "#999", fontSize: 13 }}>Sin cotizaciones aun.</p> : cotizaciones.map(cot => { const ce = ESTADO_COT_COLOR[cot.estado] || {}; return (
            <div key={cot.id} style={{ border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div><p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14 }}>{cot.proveedor_nombre || "Sin nombre"}</p><div style={{ display: "flex", gap: 6 }}>{badge(ce.label, ce.bg, ce.color)}{badge(cot.tipo, "#f0f4ff", "#2a4a8a")}</div></div>
                <div style={{ textAlign: "right" }}>{cot.monto ? <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{cot.moneda} {parseFloat(cot.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p> : <p style={{ margin: 0, color: "#999", fontSize: 13 }}>Sin monto</p>}</div>
              </div>
              {cot.descripcion && <p style={{ margin: "8px 0 0", fontSize: 13, color: "#555" }}>{cot.descripcion}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {cot.estado !== "aprobada" && cot.estado !== "rechazada" && <button onClick={() => aprobarCotizacion(cot)} style={{ padding: "5px 14px", background: "#198754", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Aprobar</button>}
                <button onClick={() => { setCotEditar(cot); setMostrarForm(true); }} style={{ padding: "5px 14px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Editar</button>
                <button onClick={() => eliminarCotizacion(cot.id)} style={{ padding: "5px 14px", background: "#fff0f0", color: "#c00", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Eliminar</button>
              </div>
            </div>
          );})}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #ddd", borderRadius: 8, background: "#fff", fontSize: 14, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
      {vistaPrevia && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={() => setVistaPrevia(null)}>{vistaPrevia.tipo === "imagen" ? <img src={vistaPrevia.url} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8 }} /> : <video src={vistaPrevia.url} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8 }} onClick={e => e.stopPropagation()} />}</div>)}
      {mostrarForm && <CotizacionForm trabajoId={trabajo.id} cotizacion={cotEditar} onClose={() => { setMostrarForm(false); setCotEditar(null); cargar(); }} />}
    </div>
  );
}
