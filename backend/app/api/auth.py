from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Usuario, Permiso, NivelPermiso
from ..schemas import UsuarioCreate, UsuarioUpdate, UsuarioOut, LoginIn, TokenOut
from ..auth import hash_password, verify_password, create_token, get_current_user, require_permiso

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == data.email, Usuario.activo == True).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "usuario": user}

@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)):
    return usuario

@router.get("/usuarios", response_model=List[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db), _=Depends(require_permiso("*", NivelPermiso.admin))):
    return db.query(Usuario).all()

@router.post("/usuarios", response_model=UsuarioOut)
def crear_usuario(data: UsuarioCreate, db: Session = Depends(get_db), _=Depends(require_permiso("*", NivelPermiso.admin))):
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email ya existe")
    user = Usuario(nombre=data.nombre, email=data.email, password_hash=hash_password(data.password), activo=data.activo)
    db.add(user)
    db.flush()
    for p in data.permisos:
        db.add(Permiso(usuario_id=user.id, modulo=p.modulo, nivel=p.nivel))
    db.commit()
    db.refresh(user)
    return user

@router.put("/usuarios/{uid}", response_model=UsuarioOut)
def actualizar_usuario(uid: int, data: UsuarioUpdate, db: Session = Depends(get_db), _=Depends(require_permiso("*", NivelPermiso.admin))):
    user = db.query(Usuario).filter(Usuario.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if data.nombre: user.nombre = data.nombre
    if data.email: user.email = data.email
    if data.activo is not None: user.activo = data.activo
    if data.password: user.password_hash = hash_password(data.password)
    if data.permisos is not None:
        db.query(Permiso).filter(Permiso.usuario_id == uid).delete()
        for p in data.permisos:
            db.add(Permiso(usuario_id=uid, modulo=p.modulo, nivel=p.nivel))
    db.commit()
    db.refresh(user)
    return user

@router.delete("/usuarios/{uid}")
def eliminar_usuario(uid: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_current_user), _=Depends(require_permiso("*", NivelPermiso.admin))):
    if uid == usuario_actual.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    user = db.query(Usuario).filter(Usuario.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()
    return {"ok": True}

from . import recuperar_admin  # noqa
