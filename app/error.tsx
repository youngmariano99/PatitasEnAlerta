'use client';

import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';

interface PropsError {
  reset: () => void;
}

export default function ErrorGlobal({ reset }: PropsError) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <EstadoIlustrado
        imagenSrc="/animales/Error-Problema.png"
        alt="Mascota confundida ante un error del sistema"
        titulo="Algo no salió como esperábamos"
        descripcion="No pudimos completar la acción. Podés intentar de nuevo — tus datos no se perdieron."
        accion={<Boton onClick={reset}>Reintentar</Boton>}
      />
    </main>
  );
}
