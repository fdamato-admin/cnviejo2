from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.api import proveedores, trabajos, auth, suministros, respaldos

Base.metadata.create_all(bind=engine)
app = FastAPI(title="CN Pueblo Viejo 2")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(trabajos.router, prefix="/api")
app.include_router(suministros.router, prefix="/api")
app.include_router(respaldos.router, prefix="/api")

@app.on_event("startup")
def _iniciar_respaldos():
    respaldos.iniciar_programador()
