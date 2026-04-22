import Link from 'next/link'
import { MapPin, Shield, Clock, ChevronRight, Home, Wrench, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display)' }}>
              BarrioAnuncios
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm py-2 px-4">
              Ingresar
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-brand-200">
            <Star className="w-3.5 h-3.5" />
            Plataforma exclusiva para vecinos del barrio
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl text-stone-900 mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}>
            Publicá en el barrio,
            <br />
            <em className="text-brand-600">conectá con vecinos</em>
          </h1>
          <p className="text-xl text-stone-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            La herramienta que los vecinos necesitan para publicar anuncios de lotes,
            alquileres y servicios dentro del barrio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-base py-3 px-8 flex items-center justify-center gap-2">
              Crear cuenta gratis
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/anuncios" className="btn-secondary text-base py-3 px-8">
              Ver anuncios activos
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-white border-y border-stone-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: Home,
                title: 'Publicá tu lote',
                desc: 'Anunciá la venta o alquiler de tu lote en minutos. Sin burocracia.',
              },
              {
                icon: Shield,
                title: 'Solo vecinos verificados',
                desc: 'Cada usuario está asociado a un lote del barrio. Comunidad real y confiable.',
              },
              {
                icon: Clock,
                title: 'Planes flexibles',
                desc: 'Elegí cuántos días querés publicar. Desde 7 hasta 60 días.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer legal */}
      <section className="py-12 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-3xl mx-auto">
          <div className="card border-amber-200 bg-amber-50/50">
            <div className="flex gap-3">
              <Wrench className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">Importante</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  BarrioAnuncios es una herramienta para vecinos, no una inmobiliaria. 
                  No asesoramos en transacciones inmobiliarias ni somos responsables por 
                  el contenido de los anuncios o las operaciones realizadas entre vecinos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-stone-200">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-400">© 2024 BarrioAnuncios. Todos los derechos reservados.</p>
          <div className="flex gap-6 text-sm text-stone-400">
            <Link href="/terminos" className="hover:text-stone-600 transition-colors">Términos y condiciones</Link>
            <Link href="/privacidad" className="hover:text-stone-600 transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
