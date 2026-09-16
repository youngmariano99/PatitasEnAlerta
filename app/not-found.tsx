import Link from 'next/link';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <EstadoIlustrado
        imagenSrc="/animales/Error-Problema.png"
        alt="Mascota confundida, sin encontrar la página"
        titulo="No encontramos esta página"
        descripcion="Puede que el enlace esté vencido o mal escrito. Volvé al inicio para seguir navegando."
        accion={
          <Link href="/" className="text-accent underline underline-offset-2">
            Ir al inicio
          </Link>
        }
      />
    </main>
  );
}
