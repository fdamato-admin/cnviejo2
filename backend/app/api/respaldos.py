import os
import re
import shutil
import sqlite3
import tempfile
import threading
import time
import zipfile
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..auth import require_permiso
from ..database import engine
from ..models import NivelPermiso

router = APIRouter(prefix="/respaldos", tags=["respaldos"])

TZ = timezone(timedelta(hours=-4))  # Venezuela, sin horario de verano
HORAS = (12, 18)
DIAS_CONSERVAR = 14
DOCS_DIR = "/data/docs"
BACKUP_DIR = "/data/backups"
PATRON = re.compile(r"^respaldo_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_(auto|manual|pre-restauracion)\.zip$")

ADMIN = Depends(require_permiso("*", NivelPermiso.admin))


def _ruta_db():
    if engine.url.get_backend_name() != "sqlite":
        raise HTTPException(status_code=500, detail="El respaldo solo funciona con SQLite")
    return engine.url.database


def _ruta_segura(nombre):
    if not PATRON.match(nombre):
        raise HTTPException(status_code=400, detail="Nombre de respaldo invalido")
    ruta = os.path.join(BACKUP_DIR, nombre)
    if not os.path.isfile(ruta):
        raise HTTPException(status_code=404, detail="Respaldo no encontrado")
    return ruta


def crear_respaldo(etiqueta="manual"):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    marca = datetime.now(TZ).strftime("%Y-%m-%d_%H-%M-%S")
    nombre = "respaldo_%s_%s.zip" % (marca, etiqueta)
    ruta_zip = os.path.join(BACKUP_DIR, nombre)
    tmp_zip = ruta_zip + ".tmp"
    tmp_db = ruta_zip + ".db.tmp"
    src = sqlite3.connect(_ruta_db())
    dst = sqlite3.connect(tmp_db)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    with zipfile.ZipFile(tmp_zip, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(tmp_db, "cnpv2.db")
        if os.path.isdir(DOCS_DIR):
            for f in os.listdir(DOCS_DIR):
                p = os.path.join(DOCS_DIR, f)
                if os.path.isfile(p):
                    z.write(p, "docs/" + f)
    os.remove(tmp_db)
    os.replace(tmp_zip, ruta_zip)
    return nombre


def _listar():
    if not os.path.isdir(BACKUP_DIR):
        return []
    items = []
    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if PATRON.match(f):
            st = os.stat(os.path.join(BACKUP_DIR, f))
            items.append({
                "nombre": f,
                "tamano": st.st_size,
                "fecha": datetime.fromtimestamp(st.st_mtime, TZ).isoformat(),
                "tipo": PATRON.match(f).group(1),
            })
    return items


def _limpiar():
    if not os.path.isdir(BACKUP_DIR):
        return
    limite = time.time() - DIAS_CONSERVAR * 86400
    for f in os.listdir(BACKUP_DIR):
        p = os.path.join(BACKUP_DIR, f)
        if PATRON.match(f) and f.endswith("_auto.zip") and os.path.getmtime(p) < limite:
            os.remove(p)


def _restaurar(ruta_zip):
    if not zipfile.is_zipfile(ruta_zip):
        raise HTTPException(status_code=400, detail="El archivo no es un respaldo valido")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    with zipfile.ZipFile(ruta_zip) as z:
        nombres = z.namelist()
        if "cnpv2.db" not in nombres:
            raise HTTPException(status_code=400, detail="El respaldo no contiene la base de datos")
        tmpdir = tempfile.mkdtemp(dir=BACKUP_DIR)
        try:
            z.extract("cnpv2.db", tmpdir)
            db_tmp = os.path.join(tmpdir, "cnpv2.db")
            con = sqlite3.connect(db_tmp)
            try:
                estado = con.execute("PRAGMA integrity_check").fetchone()[0]
                tablas = {r[0] for r in con.execute("select name from sqlite_master where type='table'")}
            finally:
                con.close()
            if estado != "ok" or "usuarios" not in tablas:
                raise HTTPException(status_code=400, detail="La base de datos del respaldo no es valida")
            crear_respaldo("pre-restauracion")
            engine.dispose()
            src = sqlite3.connect(db_tmp)
            dst = sqlite3.connect(_ruta_db())
            try:
                src.backup(dst)
            finally:
                dst.close()
                src.close()
            engine.dispose()
            os.makedirs(DOCS_DIR, exist_ok=True)
            for n in nombres:
                if n.startswith("docs/") and not n.endswith("/"):
                    base = os.path.basename(n)
                    if base:
                        with z.open(n) as s, open(os.path.join(DOCS_DIR, base), "wb") as d:
                            shutil.copyfileobj(s, d)
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


@router.get("/")
def listar_respaldos(_=ADMIN):
    return _listar()


@router.post("/")
def crear_respaldo_ahora(_=ADMIN):
    return {"nombre": crear_respaldo("manual")}


@router.post("/restaurar-archivo")
def restaurar_desde_archivo(file: UploadFile = File(...), _=ADMIN):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    tmp = os.path.join(BACKUP_DIR, "subido.tmp")
    with open(tmp, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        _restaurar(tmp)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return {"ok": True}


@router.get("/{nombre}")
def descargar_respaldo(nombre: str, _=ADMIN):
    return FileResponse(_ruta_segura(nombre), filename=nombre, media_type="application/zip")


@router.post("/{nombre}/restaurar")
def restaurar_respaldo(nombre: str, _=ADMIN):
    _restaurar(_ruta_segura(nombre))
    return {"ok": True}


@router.delete("/{nombre}", status_code=204)
def borrar_respaldo(nombre: str, _=ADMIN):
    os.remove(_ruta_segura(nombre))


def _siguiente(ahora):
    candidatos = [ahora.replace(hour=h, minute=0, second=0, microsecond=0) for h in HORAS]
    futuros = [c for c in candidatos if c > ahora]
    if futuros:
        return min(futuros)
    return candidatos[0] + timedelta(days=1)


def _bucle():
    while True:
        try:
            ahora = datetime.now(TZ)
            prox = _siguiente(ahora)
            time.sleep(max(1, (prox - ahora).total_seconds()) + 1)
            crear_respaldo("auto")
            _limpiar()
        except Exception as e:
            print("Error en respaldo automatico:", e)
            time.sleep(60)


def iniciar_programador():
    threading.Thread(target=_bucle, daemon=True).start()
