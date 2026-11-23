from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime
import os, uuid as _uuid, shutil as _shutil
from ..database import get_db
from ..models import (SolicitudInsumos, SolicitudInsumoItem, Proveedor,
                      EstadoSolicitudInsumos, EstadoProveedor, TipoProveedor,
                      CompraSuministro, Suministro, NivelPermiso)
from ..auth import get_current_user, require_permiso
from ..models import Usuario

router = APIRouter(prefix="/solicitudes-insumos", tags=["Solicitudes de Insumos"])

DOCS_DIR = "/data/docs"
os.makedirs(DOCS_DIR, exist_ok=True)
BACKEND_URL = "https://cnviejo2-production-46d5.up.railway.app"

# --- Schemas inline ---
class ItemIn(BaseModel):
    descripcion: str
    cantidad: Optional[str] = None
    unidad: Optional[str] = None
    alternativa: Optional[str] = None
    precio_usd: Optional[float] = None
    tasa_bs: Optional[float] = None
    subtotal_usd: Optional[float] = None

class SolicitudInsumoIn(BaseModel):
    obra: str
    nro_solicitud: Optional[str] = None
    fecha_requerida: Optional[str] = None
    observaciones: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    proveedor_telefono: Optional[str] = None
    validez: Optional[str] = None
    tiempo_entrega: Optional[str] = None
    condicion_pago: Optional[str] = None
    subtotal_usd: Optional[float] = None
    iva_usd: Optional[float] = None
    total_usd: Optional[float] = None
    banco: Optional[str] = None
    titular: Optional[str] = None
    cuenta: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    rif: Optional[str] = None
    observaciones_prov: Optional[str] = None
    items: List[ItemIn] = []

class ItemOut(ItemIn):
    id: int
    aprobado: bool
    class Config: from_attributes = True

class SolicitudInsumoOut(BaseModel):
    id: int
    obra: str
    nro_solicitud: Optional[str] = None
    proveedor_nombre: Optional[str]
    proveedor_telefono: Optional[str]
    condicion_pago: Optional[str]
    subtotal_usd: Optional[float]
    iva_usd: Optional[float]
    total_usd: Optional[float]
    estado: str
    creado_en: Optional[object] = None
    cotizacion_adjunta_url: Optional[str] = None
    items: List[ItemOut] = []
    class Config:
        from_attributes = True
        json_encoders = {object: str}

class AprobarItemsIn(BaseModel):
    item_ids: List[int]

class EditarItemIn(BaseModel):
    descripcion: Optional[str] = None
    alternativa: Optional[str] = None

# --- Endpoints ---
@router.post("/", response_model=SolicitudInsumoOut, status_code=201)
def crear_solicitud(data: SolicitudInsumoIn, db: Session = Depends(get_db)):
    proveedor_id = None
    if data.proveedor_telefono:
        tel = data.proveedor_telefono.strip()
        try:
            prov = db.query(Proveedor).filter(Proveedor.telefono == tel).first()
            if not prov and data.proveedor_nombre:
                prov = Proveedor(
                    nombre=data.proveedor_nombre,
                    empresa=data.proveedor_nombre,
                    tipo=TipoProveedor.insumo,
                    categoria="General",
                    telefono=tel,
                    estado=EstadoProveedor.activo
                )
                db.add(prov)
                db.flush()
            if prov:
                proveedor_id = prov.id
        except Exception:
            db.rollback()
            proveedor_id = None

    # Generar nro_solicitud si no viene en el payload
    nro_solicitud = data.nro_solicitud
    if not nro_solicitud:
        # Buscar el último número usado y sumar 1
        ultima = db.query(SolicitudInsumos.nro_solicitud)\
            .filter(SolicitudInsumos.nro_solicitud.isnot(None))\
            .order_by(SolicitudInsumos.nro_solicitud.desc())\
            .first()
        if ultima and ultima[0]:
            try:
                siguiente = int(ultima[0]) + 1
            except ValueError:
                siguiente = 1
        else:
            siguiente = 1
        nro_solicitud = str(siguiente).zfill(6)

    s = SolicitudInsumos(
        obra=data.obra,
        nro_solicitud=nro_solicitud,
        fecha_requerida=data.fecha_requerida,
        observaciones=data.observaciones,
        proveedor_id=proveedor_id,
        proveedor_nombre=data.proveedor_nombre,
        proveedor_telefono=data.proveedor_telefono,
        validez=data.validez,
        tiempo_entrega=data.tiempo_entrega,
        condicion_pago=data.condicion_pago,
        subtotal_usd=data.subtotal_usd,
        iva_usd=data.iva_usd,
        total_usd=data.total_usd,
        banco=data.banco,
        titular=data.titular,
        cuenta=data.cuenta,
        tipo_cuenta=data.tipo_cuenta,
        rif=data.rif,
        observaciones_prov=data.observaciones_prov,
        estado=EstadoSolicitudInsumos.cotizada if data.proveedor_nombre else EstadoSolicitudInsumos.pendiente
    )
    db.add(s)
    db.flush()

    for it in data.items:
        item = SolicitudInsumoItem(
            solicitud_id=s.id,
            descripcion=it.descripcion,
            cantidad=it.cantidad,
            unidad=it.unidad,
            alternativa=it.alternativa,
            precio_usd=it.precio_usd,
            tasa_bs=it.tasa_bs,
            subtotal_usd=it.subtotal_usd
        )
        db.add(item)

    db.commit()
    db.refresh(s)
    return s

@router.get("/nuevo-nro")
def nuevo_nro_solicitud(db: Session = Depends(get_db)):
    """Genera y reserva el próximo número de solicitud (sin crear registro)."""
    ultima = db.query(SolicitudInsumos.nro_solicitud)\
        .filter(SolicitudInsumos.nro_solicitud.isnot(None))\
        .order_by(SolicitudInsumos.nro_solicitud.desc())\
        .first()
    if ultima and ultima[0]:
        try:
            siguiente = int(ultima[0]) + 1
        except ValueError:
            siguiente = 1
    else:
        siguiente = 1
    return {"nro_solicitud": str(siguiente).zfill(6)}

@router.get("/", response_model=List[SolicitudInsumoOut])
def listar_solicitudes(nro_solicitud: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(SolicitudInsumos)
    if nro_solicitud:
        q = q.filter(SolicitudInsumos.nro_solicitud == nro_solicitud)
    return q.order_by(SolicitudInsumos.creado_en.desc()).all()

@router.get("/comparar/{nro_solicitud}")
def comparar_solicitud_get(nro_solicitud: str, db: Session = Depends(get_db)):
    """Compara precios de proveedores para un mismo nro_solicitud."""
    from collections import defaultdict
    solicitudes = db.query(SolicitudInsumos)\
        .filter(SolicitudInsumos.nro_solicitud == nro_solicitud)\
        .all()
    if not solicitudes:
        raise HTTPException(404, "No hay cotizaciones para ese número de solicitud")

    items_por_desc = defaultdict(list)
    for s in solicitudes:
        for it in s.items:
            # Agrupar por descripción ORIGINAL del pedido (no por alternativa)
            desc = (it.descripcion or '').strip().upper()
            items_por_desc[desc].append({
                "solicitud_id": s.id,
                "proveedor": s.proveedor_nombre,
                "descripcion": it.descripcion,
                "alternativa": it.alternativa,
                "cantidad": it.cantidad,
                "unidad": it.unidad,
                "precio_usd": float(it.precio_usd) if it.precio_usd else None,
                "subtotal_usd": float(it.subtotal_usd) if it.subtotal_usd else None,
            })

    resultado = []
    for desc, ofertas in items_por_desc.items():
        precios_validos = [o for o in ofertas if o["precio_usd"] is not None]
        min_precio = min((o["precio_usd"] for o in precios_validos), default=None)
        hay_competencia = len(precios_validos) >= 2
        for o in ofertas:
            o["es_mejor_precio"] = hay_competencia and (o["precio_usd"] == min_precio) if min_precio is not None else False
        resultado.append({
            "descripcion": desc,
            "ofertas": sorted(ofertas, key=lambda x: (x["precio_usd"] or 9999999))
        })

    return {
        "nro_solicitud": nro_solicitud,
        "proveedores": [s.proveedor_nombre for s in solicitudes],
        "items": resultado
    }

@router.get("/{id}", response_model=SolicitudInsumoOut)
def obtener_solicitud(id: int, db: Session = Depends(get_db)):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")
    return s

@router.patch("/items/{item_id}")
def editar_item(item_id: int, body: EditarItemIn, db: Session = Depends(get_db)):
    item = db.query(SolicitudInsumoItem).filter(SolicitudInsumoItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    if body.descripcion is not None:
        item.descripcion = body.descripcion
    if body.alternativa is not None:
        item.alternativa = body.alternativa
    db.commit()
    db.refresh(item)
    return {"ok": True, "id": item.id, "descripcion": item.descripcion, "alternativa": item.alternativa}

@router.patch("/{id}/aprobar-items")
def aprobar_items(id: int, body: AprobarItemsIn, db: Session = Depends(get_db)):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")
    for item in s.items:
        item.aprobado = item.id in body.item_ids
    s.estado = EstadoSolicitudInsumos.aprobada
    db.commit()
    return {"ok": True}

@router.patch("/{id}/convertir-compra")
def convertir_compra(id: int, db: Session = Depends(get_db)):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")

    hoy = date.today()
    items_aprobados = [it for it in s.items if it.aprobado]

    if not items_aprobados:
        raise HTTPException(400, "No hay items aprobados para convertir")

    for it in items_aprobados:
        try:
            cant = float(it.cantidad) if it.cantidad else None
        except (ValueError, TypeError):
            cant = None

        # Crear el suministro en la BD (solo al momento de convertir)
        nuevo_sum = Suministro(
            nombre=it.alternativa or it.descripcion,
            categoria="Cotizacion",
            unidad=it.unidad or "und",
            proveedor=s.proveedor_nombre,
            ultima_fecha_compra=hoy,
            ultimo_precio=it.precio_usd,
            tasa_cambio=it.tasa_bs,
            precio_bs=(it.precio_usd * it.tasa_bs) if (it.precio_usd and it.tasa_bs) else None,
            tipo_documento=s.condicion_pago or None,
            numero_documento=f"COT-{s.id}"
        )
        db.add(nuevo_sum)
        db.flush()  # obtener nuevo_sum.id

        compra = CompraSuministro(
            suministro_id=nuevo_sum.id,
            fecha_compra=hoy,
            cantidad=cant,
            monto_usd=it.subtotal_usd,
            nombre=it.alternativa or it.descripcion
        )
        db.add(compra)

    s.estado = EstadoSolicitudInsumos.convertida
    db.commit()
    return {"id": s.id, "estado": s.estado}

@router.post("/{id}/adjunto-cotizacion")
async def subir_adjunto_cotizacion(id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Permite al proveedor subir su propia cotización (PDF o imagen) sin llenar el formulario."""
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "Solicitud no encontrada")
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    nombre = f"cot_adjunta_{_uuid.uuid4().hex}.{ext}"
    ruta = os.path.join(DOCS_DIR, nombre)
    with open(ruta, "wb") as f:
        _shutil.copyfileobj(file.file, f)
    url = f"{BACKEND_URL}/api/trabajos/cotizaciones/docs/{nombre}"
    s.cotizacion_adjunta_url = url
    if s.estado == EstadoSolicitudInsumos.pendiente:
        s.estado = EstadoSolicitudInsumos.cotizada
    db.commit()
    return {"url": url, "ok": True}

@router.delete("/{id}")
def eliminar_solicitud(
    id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("*", NivelPermiso.admin))
):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")

    era_convertida = s.estado == EstadoSolicitudInsumos.convertida
    nro = s.nro_solicitud

    db.delete(s)
    db.flush()

    # Si la que se eliminó estaba convertida, revisar si quedan otras convertidas
    # del mismo nro_solicitud. Si no quedan, revertir las restantes a "cotizada"
    if era_convertida and nro:
        quedan_convertidas = db.query(SolicitudInsumos).filter(
            SolicitudInsumos.nro_solicitud == nro,
            SolicitudInsumos.estado == EstadoSolicitudInsumos.convertida
        ).count()
        if quedan_convertidas == 0:
            db.query(SolicitudInsumos).filter(
                SolicitudInsumos.nro_solicitud == nro
            ).update({"estado": EstadoSolicitudInsumos.cotizada})

    db.commit()
    return {"ok": True}
