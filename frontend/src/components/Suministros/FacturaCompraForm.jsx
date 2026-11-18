import React, { useState, useEffect } from 'react';
import API from '../../api';

const CATEGORIAS = ['Quimicos de piscina','Equipos de piscina','Jardineria y areas verdes','Electricidad','Plomeria / Fontaneria','Planta electrica','Seguridad / Vigilancia','Pintura e impermeabilizacion','Ferreteria y materiales','Limpieza','Aire acondicionado','Informatica y tecnologia','Otro'];
const DOCUMENTOS = ['Nota de Entrega','Factura','Otro'];
const MONEDAS = ['Dolares','Bs','Euros','USDT'];
const UNIDADES = ['UND','KG','LT','MT','M2','M3','GLN','CAJA','BOLSA','ROLLO','PAR','JGO','SRV','HRS'];

const norm = s => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();

function ArticuloCombo({ value, onChange, opciones, estilo }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState({ top:0, left:0, width:200 });
  const refInput = React.useRef(null);

  const nq = norm(q);
  const lista = nq
    ? opciones.filter(o => norm(o.nombre).includes(nq) || norm(o.codigo||'').includes(nq))
    : opciones;

  const elegir = (o) => { onChange(o.nombre, o); setQ(''); setAbierto(false); };

  const abrirCombo = () => {
    if (refInput.current) {
      const r = refInput.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: Math.max(r.width, 240) });
    }
    setQ('');
    setAbierto(true);
  };

  return (
    <div style={{ position:'relative' }}>
      <input
        ref={refInput}
        value={abierto ? q : (value||'')}
        placeholder="Buscar artículo..."
        onFocus={abrirCombo}
        onChange={e => setQ(e.target.value.toUpperCase())}
        onBlur={() => setTimeout(() => setAbierto(false), 200)}
        autoComplete="off"
        style={estilo}
      />
      {abierto && lista.length > 0 && (
        <div style={{ position:'fixed', top: pos.top + 2, left: pos.left, width: pos.width,
          zIndex:9999, background:'#fff', border:'1px solid #ddd', borderRadius:8,
          maxHeight:220, overflowY:'auto', boxShadow:'0 4px 14px rgba(0,0,0,0.2)' }}>
          {lista.map(o => (
            <div key={o.id||o.nombre}
              onMouseDown={e => { e.preventDefault(); elegir(o); }}
              style={{ padding:'7px 12px', fontSize:13, cursor:'pointer',
                background: o.nombre===value ? '#e8f0fe':'#fff',
                borderBottom:'1px solid #f0f0f0' }}
              onMouseEnter={e => e.currentTarget.style.background='#f0f5ff'}
              onMouseLeave={e => e.currentTarget.style.background=o.nombre===value?'#e8f0fe':'#fff'}>
              <span style={{ fontWeight:600 }}>{o.nombre}</span>
              {o.codigo && <span style={{ marginLeft:8, fontSize:11, color:'#888', fontFamily:'monospace' }}>[{o.codigo}]</span>}
              {o.categoria && <span style={{ marginLeft:6, fontSize:11, color:'#aaa' }}>{o.categoria}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function iV(pct) {
  return { nombre:'', categoria:'', unidad:'', cantidad:'1', precio_unitario:'', aplica_iva:true, iva_porcentaje:String(pct||16), moneda_pago:'Dolares' };
}

function calcItem(it) {
  const p = parseFloat(it.precio_unitario)||0, q = parseFloat(it.cantidad)||1;
  const pct = it.aplica_iva ? (parseFloat(it.iva_porcentaje)||0) : 0;
  const sub = p*q, iva = sub*pct/100;
  return { sub:sub.toFixed(2), iva:iva.toFixed(2), total:(sub+iva).toFixed(2) };
}

export default function FacturaCompraForm({ onClose, onGuardado }) {
  const [ivaD, setIvaD] = useState(16);
  const [proveedores, setProveedores] = useState([]);
  const [suministrosLista, setSuministrosLista] = useState([]);
  const [catalogoLista, setCatalogoLista] = useState([]);
  const [pedidosLista, setPedidosLista] = useState([]);
  const [form, setForm] = useState({
    fecha_compra: new Date().toISOString().slice(0,10),
    tipo_documento:'Factura', documento_otro:'', numero_documento:'', proveedor:'',
    estado_recepcion:'Recibido', notas:''
  });
  const [items, setItems] = useState([iV(16)]);
  const [tasaGlobal, setTasaGlobal] = useState('');
  const hayMonedaBs = items.some(it => it.moneda_pago === 'Bs');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/suministros/config/iva').then(r => {
      if (r.data?.iva_porcentaje !== undefined) {
        setIvaD(r.data.iva_porcentaje);
        setItems([iV(r.data.iva_porcentaje)]);
      }
    }).catch(()=>{});
    API.get('/proveedores/').then(r => setProveedores(r.data || [])).catch(()=>{});
    API.get('/suministros/').then(r => setSuministrosLista(r.data || [])).catch(()=>{});
    API.get('/catalogo-insumos/').then(r => setCatalogoLista(r.data || [])).catch(()=>{});
    API.get('/pedidos-suministros/').then(r => setPedidosLista(r.data || [])).catch(()=>{});
  }, []);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));
  const setItem = (idx,k,v) => setItems(arr => {
    const n=[...arr];
    n[idx]={...n[idx],[k]:v};
    if(k==='aplica_iva'&&!v) n[idx].iva_porcentaje='0';
    if(k==='aplica_iva'&&v) n[idx].iva_porcentaje=String(ivaD);
    // Al cambiar el nombre, buscar en catálogo y pre-rellenar categoría y unidad
    if(k==='nombre') {
      const nombreUp = v.trim().toUpperCase();
      const enCat = catalogoLista.find(c => c.nombre.toUpperCase() === nombreUp);
      const enSum = suministrosLista.find(s => (s.nombre||'').toUpperCase() === nombreUp);
      const enPed = pedidosLista.find(p => (p.nombre||'').toUpperCase() === nombreUp);
      const fuente = enCat || enSum || enPed;
      if(fuente) {
        if(!n[idx].categoria && fuente.categoria) n[idx].categoria = fuente.categoria;
        if(!n[idx].unidad && fuente.unidad) n[idx].unidad = fuente.unidad;
      }
    }
    return n;
  });

  const tots = items.reduce((a,it)=>{
    const c=calcItem(it);
    a.sub+=parseFloat(c.sub)||0;
    a.iva+=parseFloat(c.iva)||0;
    a.total+=parseFloat(c.total)||0;
    return a;
  },{sub:0,iva:0,total:0});

  const guardar = async () => {
    if (!form.fecha_compra) { setError('La fecha es obligatoria'); return; }
    if (!form.tipo_documento) { setError('Tipo de documento requerido'); return; }
    if (form.tipo_documento==='Otro' && !form.documento_otro.trim()) { setError('Especifica el tipo de documento'); return; }
    for (let i=0;i<items.length;i++) {
      if (!items[i].nombre.trim()) { setError(`Item ${i+1}: nombre obligatorio`); return; }
      if (!items[i].categoria) { setError(`Item ${i+1}: categoria obligatoria`); return; }
    }
    setGuardando(true); setError('');
    try {
      const payload = {
        ...form,
        items: items.map(it=>({
          ...it,
          nombre: it.nombre.trim().toUpperCase(),
          cantidad: parseFloat(it.cantidad)||1,
          precio_unitario: parseFloat(it.precio_unitario)||0,
          iva_porcentaje: parseFloat(it.iva_porcentaje)||0,
          tasa_cambio: parseFloat(it.tasa_cambio)||0,
          aplica_iva: !!it.aplica_iva
        }))
      };
      await API.post('/suministros/factura', payload);
      if (onGuardado) onGuardado(`Factura guardada: ${items.length} articulo${items.length!==1?'s':''} registrado${items.length!==1?'s':''}.`);
      onClose();
    } catch(e) {
      setError('Error al guardar. Verifique los datos e intente de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const iS = { width:'100%', padding:'6px 9px', border:'1px solid #ddd', borderRadius:7, fontSize:13, boxSizing:'border-box' };
  const lS = { display:'block', fontSize:12, fontWeight:500, color:'#555', marginBottom:3 };
  const thS = { padding:'7px 8px', textAlign:'left', fontWeight:600, fontSize:11, whiteSpace:'nowrap', borderBottom:'2px solid rgba(255,255,255,0.2)' };
  const tdS = { padding:'5px 7px', verticalAlign:'middle' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1000, padding:'18px 10px', overflowY:'auto' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:22, width:'100%', maxWidth:1060, marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>Ingresar factura / nota de entrega</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#888' }}>x</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))', gap:'0 12px', background:'#f5f7fa', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
          <div style={{marginBottom:10}}><label style={lS}>Fecha *</label><input type="date" value={form.fecha_compra} onChange={e=>setF('fecha_compra',e.target.value)} style={iS}/></div>
          <div style={{marginBottom:10}}><label style={lS}>Tipo doc *</label><select value={form.tipo_documento} onChange={e=>setF('tipo_documento',e.target.value)} style={iS}>{DOCUMENTOS.map(d=><option key={d}>{d}</option>)}</select></div>
          {form.tipo_documento==='Otro' && <div style={{marginBottom:10}}><label style={lS}>Especificar *</label><input value={form.documento_otro} onChange={e=>setF('documento_otro',e.target.value)} style={iS}/></div>}
          <div style={{marginBottom:10}}><label style={lS}>N Documento</label><input value={form.numero_documento} onChange={e=>setF('numero_documento',e.target.value)} style={iS} placeholder="Ej: 00123"/></div>
          <div style={{marginBottom:10}}><label style={lS}>Proveedor</label><select value={form.proveedor} onChange={e=>setF('proveedor',e.target.value)} style={iS}><option value="">-- Seleccionar --</option>{proveedores.map(p=><option key={p.id} value={p.nombre}>{p.nombre}</option>)}</select></div>
          <div style={{marginBottom:10}}><label style={lS}>Estado</label><select value={form.estado_recepcion} onChange={e=>setF('estado_recepcion',e.target.value)} style={iS}><option>Por recibir</option><option>Recibido</option></select></div>
          {hayMonedaBs && (<div style={{marginBottom:10,background:'#fffbe6',borderRadius:8,padding:'8px 10px',border:'1px solid #ffe58f'}}><label style={{...lS,color:'#b45309'}}>Tasa Bs (global) *</label><input type="number" min="0" step="0.01" value={tasaGlobal} onChange={e=>setTasaGlobal(e.target.value)} style={{...iS,fontWeight:600}} placeholder="Bs por $1"/><span style={{fontSize:11,color:'#92400e'}}> Aplica a todos los items en Bs</span></div>)}
          <div style={{marginBottom:10, gridColumn:'1 / -1'}}><label style={lS}>Notas</label><input value={form.notas} onChange={e=>setF('notas',e.target.value)} style={iS} placeholder="Observaciones (opcional)"/></div>
        </div>

        <div style={{ overflowX:'auto', marginBottom:12 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#1a3a5c', color:'#fff' }}>
                <th style={thS}>#</th>
                <th style={{...thS,minWidth:145}}>Articulo *</th>
                <th style={{...thS,minWidth:130}}>Categoria *</th>
                <th style={{...thS,minWidth:65}}>Unidad</th>
                <th style={{...thS,width:62}}>Cant.</th>
                <th style={{...thS,width:82}}>Moneda</th>
                <th style={{...thS,width:115}}>Precio unit.</th>
                <th style={{...thS,width:68}}>Tasa Bs</th>
                <th style={{...thS,width:42,textAlign:'center'}}>IVA</th>
                <th style={{...thS,width:56}}>%IVA</th>
                <th style={{...thS,width:100,background:'#1a5c3a'}}>Subtotal</th>
                <th style={{...thS,width:75,background:'#1a5c3a'}}>IVA $</th>
                <th style={{...thS,width:100,background:'#0d3d26'}}>Total</th>
                <th style={{...thS,width:30}}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it,i)=>{
                const c=calcItem(it);
                return (
                  <tr key={i} style={{ background:i%2===0?'#fff':'#f8fafc', borderBottom:'1px solid #eee' }}>
                    <td style={tdS}>{i+1}</td>
                    <td style={tdS}>
                      <ArticuloCombo
                        value={it.nombre}
                        onChange={(nombre, o) => {
                          setItems(arr => {
                            const n=[...arr];
                            n[i]={...n[i], nombre};
                            if(o.categoria && !n[i].categoria) n[i].categoria = o.categoria;
                            if(o.unidad && !n[i].unidad) n[i].unidad = o.unidad;
                            return n;
                          });
                        }}
                        opciones={(() => {
                          const vistos = new Set();
                          const result = [];
                          for (const o of [
                            ...catalogoLista,
                            ...suministrosLista,
                            ...pedidosLista,
                          ]) {
                            const k = (o.nombre||'').toUpperCase();
                            if (k && !vistos.has(k)) { vistos.add(k); result.push(o); }
                          }
                          return result;
                        })()}
                        estilo={iS}
                      />
                    </td>
                    <td style={tdS}><select value={it.categoria} onChange={e=>setItem(i,'categoria',e.target.value)} style={iS}><option value="">Seleccionar...</option>{CATEGORIAS.map(cat=><option key={cat}>{cat}</option>)}</select></td>
                    <td style={tdS}><input list="ul" value={it.unidad} onChange={e=>setItem(i,'unidad',e.target.value.toUpperCase())} style={{...iS,width:70}} placeholder="UND"/><datalist id="ul">{UNIDADES.map(u=><option key={u} value={u}/>)}</datalist></td>
                    <td style={tdS}><input type="number" min="0" step="0.01" value={it.cantidad} onChange={e=>setItem(i,'cantidad',e.target.value)} style={{...iS,minWidth:80}}/></td>
                    <td style={tdS}><select value={it.moneda_pago} onChange={e=>setItem(i,'moneda_pago',e.target.value)} style={iS}>{MONEDAS.map(m=><option key={m}>{m}</option>)}</select></td>
                    <td style={tdS}><input type="number" min="0" step="0.01" value={it.precio_unitario} onChange={e=>setItem(i,'precio_unitario',e.target.value)} style={iS} placeholder="0.00"/></td>
                    <td style={tdS}><span style={{color:'#aaa',fontSize:12}}>{it.moneda_pago==='Bs'?(tasaGlobal||'?'):'-'}</span></td>
                    <td style={{...tdS,textAlign:'center'}}><input type="checkbox" checked={it.aplica_iva} onChange={e=>setItem(i,'aplica_iva',e.target.checked)} style={{width:16,height:16,cursor:'pointer'}}/></td>
                    <td style={tdS}><input type="number" min="0" max="100" step="0.01" value={it.iva_porcentaje} onChange={e=>setItem(i,'iva_porcentaje',e.target.value)} disabled={!it.aplica_iva} style={{...iS,background:it.aplica_iva?'#fff':'#f5f7fa',width:52}}/></td>
                    <td style={{...tdS,fontWeight:600,color:'#1a3a5c',textAlign:'right'}}>{c.sub}</td>
                    <td style={{...tdS,color:'#666',textAlign:'right'}}>{it.aplica_iva?c.iva:'0.00'}</td>
                    <td style={{...tdS,fontWeight:700,color:'#1a7a3c',textAlign:'right'}}>{c.total}</td>
                    <td style={tdS}>{items.length>1&&<button onClick={()=>setItems(arr=>arr.filter((_,idx)=>idx!==i))} style={{background:'none',border:'none',color:'#c00',fontSize:16,cursor:'pointer',padding:'2px 4px'}}>x</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button onClick={()=>setItems(arr=>[...arr,iV(ivaD)])} style={{ padding:'6px 15px', border:'1px dashed #2a78d6', borderRadius:8, background:'#f0f6ff', color:'#2a78d6', fontSize:13, cursor:'pointer', marginBottom:14 }}>+ Agregar articulo</button>

        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
          <div style={{ background:'#1a3a5c', color:'#fff', borderRadius:10, padding:'12px 20px', textAlign:'right', minWidth:195 }}>
            <div style={{fontSize:12,opacity:0.8}}>Subtotal</div>
            <div style={{fontSize:16,fontWeight:600}}>${tots.sub.toFixed(2)}</div>
            <div style={{fontSize:12,opacity:0.7,marginTop:4}}>IVA</div>
            <div style={{fontSize:14,fontWeight:500}}>${tots.iva.toFixed(2)}</div>
            <div style={{fontSize:12,opacity:0.7,marginTop:4}}>TOTAL</div>
            <div style={{fontSize:20,fontWeight:700}}>${tots.total.toFixed(2)}</div>
          </div>
        </div>

        {error && <p style={{color:'#e24b4a',fontSize:13,marginBottom:10}}>{error}</p>}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'10px 20px', border:'1px solid #ddd', borderRadius:8, background:'#fff', fontSize:14, cursor:'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ padding:'10px 24px', background:'#2a78d6', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:500, cursor:'pointer', opacity:guardando?0.7:1 }}>{guardando?'Guardando...':'Guardar factura'}</button>
        </div>
      </div>
    </div>
  );
}
