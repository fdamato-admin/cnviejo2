from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import Usuario, Permiso, NivelPermiso

SECRET_KEY = "cnpuebloviejo2-secret-key-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if uid is None:
            raise exc
    except JWTError:
        raise exc
    user = db.query(Usuario).filter(Usuario.id == int(uid), Usuario.activo == True).first()
    if not user:
        raise exc
    return user

def require_permiso(modulo: str, nivel_minimo: NivelPermiso):
    orden = {NivelPermiso.consulta: 0, NivelPermiso.operador: 1, NivelPermiso.admin: 2}
    def dep(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
        permisos = db.query(Permiso).filter(Permiso.usuario_id == usuario.id).all()
        global_p = next((p for p in permisos if p.modulo == "*"), None)
        especifico = next((p for p in permisos if p.modulo == modulo), None)
        candidatos = [p for p in [global_p, especifico] if p]
        if not candidatos:
            raise HTTPException(status_code=403, detail="Sin permisos")
        mejor = max(candidatos, key=lambda p: orden[p.nivel])
        if orden[mejor.nivel] < orden[nivel_minimo]:
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return usuario
    return dep
