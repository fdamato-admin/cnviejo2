import os
import uuid as _uuid
import shutil as _shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Trabajo, Cotizacion, EstadoTrabajo, EstadoCotizacion
from ..schemas import TrabajoCreate, TrabajoUpdate, TrabajoOut, TrabajoMediaUpdate, CotizacionCreate, CotizacionUpdate, CotizacionOut

router = APIRouter(prefix="/trabajos", tags=["trabajos"])

DOCS_DIR = "/data/docs"
os.makedirs(DOCS_DIR, exist_ok=True)

BACKEND_URL = "https://cnviejo2-production-46d5.up.railway.app"

@router.get("/", response_model=List[TrabajoOut])
def listar_trabajos(estado: Optional[str] = None, categoria: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Trabajo)
    if estado:
        q = q.filter(Trabajo.estado == estado)
    if categoria:
        q = q.filter(Trabajo.categoria == categoria)
    return q.order_by(Trabajo.creado_en.desc()).all()

@router.post("/", response_model=TrabajoOut, status_code=201)
def crear_trabajo(data: TrabajoCreate, db: Session = Depends(get_db)):
    trabajo = Trabajo(**data.model_dump())
    db.add(trabajo)
    db.commit()
    db.refresh(trabajo)
    return trabajo

@router.get("/{trabajo_id}", response_model=TrabajoOut)
def obtener_trabajo(trabajo_id: int, db: Session = Depends(get_db)):
    trabajo = db.query(Trabajo).filter(Trabajo.id == trabajo_id).first()
    if not trabajo:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    return trabajo

@router.put("/{trabajo_id}", response_model=TrabajoOut)
def actualizar_trabajo(trabajo_id: int, data: TrabajoUpdate, db: Session = Depends(get_db)):
    trabajo = db.query(Trabajo).filter(Trabajo.id == trabajo_id).first()
    if not trabajo:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(trabajo, k, v)
    db.commit()
    db.refresh(trabajo)
    return trabajo

@router.patch("/{trabajo_id}/media", response_model=TrabajoOut)
def actualizar_media(trabajo_id: int, data: TrabajoMediaUpdate, db: Session = Depends(get_db)):
    trabajo = db.query(Trabajo).filter(Trabajo.id == trabajo_id).first()
    if not trabajo:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(trabajo, k, v)
    db.commit()
    db.refresh(trabajo)
    return trabajo

@router.delete("/{trabajo_id}", status_code=204)
def eliminar_trabajo(trabajo_id: int, db: Session = Depends(get_db)):
    trabajo = db.query(Trabajo).filter(Trabajo.id == trabajo_id).first()
    if not trabajo:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    db.delete(trabajo)
    db.commit()

@router.get("/{trabajo_id}/cotizaciones", response_model=List[CotizacionOut])
def listar_cotizaciones(trabajo_id: int, db: Session = Depends(get_db)):
    return db.query(Cotizacion).filter(Cotizacion.trabajo_id == trabajo_id).all()

@router.post("/{trabajo_id}/cotizaciones", response_model=CotizacionOut, status_code=201)
def agregar_cotizacion(trabajo_id: int, data: CotizacionCreate, db: Session = Depends(get_db)):
    trabajo = db.query(Trabajo).filter(Trabajo.id == trabajo_id).first()
    if not trabajo:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    data_dict = data.model_dump()
    data_dict["trabajo_id"] = trabajo_id
    cotizacion = Cotizacion(**data_dict)
    db.add(cotizacion)
    if trabajo.estado not in (EstadoTrabajo.aprobado, EstadoTrabajo.en_ejecucion, EstadoTrabajo.completado, EstadoTrabajo.cancelado):
       trabajo.estado = EstadoTrabajo.cotizaciones_recibidas
    db.commit()
    db.refresh(cotizacion)
    return cotizacion

@router.get("/cotizaciones/docs/{nombre}")
def descargar_documento(nombre: str):
    ruta = os.path.join(DOCS_DIR, nombre)
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(ruta)

@router.post("/cotizaciones/{cotizacion_id}/documento")
async def subir_documento(cotizacion_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    cotizacion = db.query(Cotizacion).filter(Cotizacion.id == cotizacion_id).first()
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotizacion no encontrada")
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    nombre = f"{_uuid.uuid4().hex}.{ext}"
    ruta = os.path.join(DOCS_DIR, nombre)
    with open(ruta, "wb") as f:
        _shutil.copyfileobj(file.file, f)
    url = f"{BACKEND_URL}/api/trabajos/cotizaciones/docs/{nombre}"
    cotizacion.documento_url = url
    db.commit()
    return {"url": url}

@router.put("/cotizaciones/{cotizacion_id}", response_model=CotizacionOut)
def actualizar_cotizacion(cotizacion_id: int, data: CotizacionUpdate, db: Session = Depends(get_db)):
    cotizacion = db.query(Cotizacion).filter(Cotizacion.id == cotizacion_id).first()
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotizacion no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cotizacion, k, v)
    db.commit()
    db.refresh(cotizacion)
    return cotizacion


@router.delete("/cotizaciones/{cotizacion_id}", status_code=204)
def eliminar_cotizacion(cotizacion_id: int, db: Session = Depends(get_db)):
    cotizacion = db.query(Cotizacion).filter(Cotizacion.id == cotizacion_id).first()
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotizacion no encontrada")
    trabajo_id = cotizacion.trabajo_id
    db.delete(cotizacion)
    db.flush()
    trabajo = db.query(Trabajo).filter(Trabajo.id == trabajo_id).first()
    if trabajo and trabajo.estado not in (EstadoTrabajo.aprobado, EstadoTrabajo.en_ejecucion, EstadoTrabajo.completado, EstadoTrabajo.cancelado):
        restantes = db.query(Cotizacion).filter(Cotizacion.trabajo_id == trabajo_id).count()
        if restantes == 0:
            trabajo.estado = EstadoTrabajo.pendiente_cotizacion
        else:
            trabajo.estado = EstadoTrabajo.cotizaciones_recibidas
    db.commit()

