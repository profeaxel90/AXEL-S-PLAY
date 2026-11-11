import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Users, Trophy, Shield, Gamepad2, BookOpen,
  QrCode, BarChart3, Star, ArrowRight, CheckCircle2,
  Globe, Play, Target, Sparkles
} from 'lucide-react';

// Datos de modos de juego
const GAME_MODES = [
  { icon: '⚔️', name: 'Batalla en Vivo', desc: 'Multijugador en tiempo real', color: 'from-red-500 to-orange-500' },
  { icon: '🏋️', name: 'Individual', desc: 'A tu propio ritmo', color: 'from-blue-500 to-cyan-500' },
  { icon: '🤝', name: 'Por Equipos', desc: 'Colaboración y estrategia', color: 'from-green-500 to-teal-500' },
  { icon: '❤️', name: 'Supervivencia', desc: 'Conserva tus vidas', color: 'from-red-600 to-pink-600' },
  { icon: '🔐', name: 'Escape Room', desc: 'Retos por habitaciones', color: 'from-purple-600 to-violet-600' },
  { icon: '🎡', name: 'Ruleta', desc: 'Categorías al azar', color: 'from-yellow-500 to-amber-500' },
  { icon: '🔍', name: 'Detecta el Error', desc: 'Identifica lo incorrecto', color: 'from-indigo-500 to-blue-600' },
  { icon: '📋', name: 'Ordena y Gana', desc: 'Drag & Drop inteligente', color: 'from-teal-500 to-green-600' },
  { icon: '✅', name: 'Verdadero/Falso', desc: 'Decisiones rápidas', color: 'from-pink-500 to-rose-600' },
];

// Características principales
const FEATURES = [
  {
    icon: <QrCode className="w-8 h-8" />,
    title: 'Acceso por QR Exclusivo',
    desc: 'Los estudiantes ingresan escaneando el QR. Sin formularios, sin contraseñas, sin complicaciones.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Poderes del Docente',
    desc: 'Otorga super-poderes a los participantes: doble puntos, tiempo extra, escudos, pistas y más.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Multijugador en Tiempo Real',
    desc: 'Sincronización instantánea para todos los participantes. Rankings actualizados al momento.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: <Trophy className="w-8 h-8" />,
    title: 'Gamificación Completa',
    desc: 'XP, niveles, insignias, rachas, misiones y logros que mantienen la motivación alta.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Analítica Pedagógica',
    desc: 'Reportes detallados por pregunta, participante y sesión. Exporta a Excel, PDF o CSV.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Seguridad y Privacidad',
    desc: 'Protección de datos, tokens únicos por sesión y cumplimiento de normativa de protección de menores.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
];

// Contextos de uso
const CONTEXTS = [
  'Educación Primaria', 'Educación Secundaria', 'Bachillerato',
  'Educación Superior', 'Formación Técnica', 'Capacitación Empresarial',
  'Escuelas de Conducción', 'Educación Vial', 'Aprendizaje Autónomo',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState('');

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinInput.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (clean) {
      navigate(`/join/${clean}`);
    } else {
      navigate('/join');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Fondo animado */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Partículas decorativas */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-purple-400/40"
              style={{
                left: `${10 + (i * 7.5)}%`,
                top: `${15 + (i % 4) * 20}%`,
              }}
              animate={{ y: [-10, 10], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Plataforma Educativa Interactiva
            <Sparkles className="w-4 h-4" />
          </motion.div>

          {/* Logo / Título */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="mb-6"
          >
            <h1 className="text-7xl md:text-9xl font-black tracking-tight mb-2">
              <span className="text-gradient">AXEL'S</span>
              <span className="text-white"> PLAY</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-xl md:text-2xl text-white/60 font-medium">
              <Gamepad2 className="w-6 h-6 text-purple-400" />
              <span>Aprender jugando. Competir. Superar retos.</span>
            </div>
          </motion.div>

          {/* Descripción */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            La plataforma educativa gamificada con <strong className="text-purple-400">9 modos de juego</strong>,
            acceso exclusivo por QR, poderes especiales del docente y analítica pedagógica en tiempo real.
            Diseñada para instituciones educativas, formación empresarial y aprendizaje autónomo.
          </motion.p>

          {/* Kahoot-style PIN Join Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-md mx-auto mb-10 bg-gradient-to-r from-purple-900/70 via-indigo-900/60 to-slate-900/80 backdrop-blur-xl border-2 border-purple-500/50 p-6 rounded-3xl shadow-2xl shadow-purple-900/50 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2 text-purple-300 font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>¿Tienes un PIN de partida? ¡Únete ahora!</span>
            </div>
            <form onSubmit={handleJoinByPin} className="flex flex-col sm:flex-row gap-2 mt-3">
              <input
                type="text"
                placeholder="PIN (ej: 482915)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                maxLength={8}
                className="flex-1 text-center text-2xl font-black tracking-widest uppercase bg-slate-950/90 border border-purple-400/50 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder:text-white/30 placeholder:tracking-normal placeholder:text-base"
              />
              <button
                type="submit"
                className="btn-primary py-3 px-6 rounded-2xl font-black text-base bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-lg shadow-purple-600/40 flex items-center justify-center gap-1.5"
              >
                <span>¡Jugar!</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 text-xs text-white/60">
              <span>¿Tienes una actividad asignada para casa?</span>
              <Link to="/homework" className="text-yellow-300 hover:text-yellow-200 font-bold underline flex items-center gap-1">
                <span>Entrar a Tareas</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/register" className="btn-primary text-lg px-8 py-4 rounded-2xl">
              <Play className="w-5 h-5" />
              Comenzar Gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-4 rounded-2xl">
              <BookOpen className="w-5 h-5" />
              Iniciar Sesión
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-8 mt-16"
          >
            {[
              { value: '9', label: 'Modos de Juego' },
              { value: '10+', label: 'Tipos de Preguntas' },
              { value: '100%', label: 'Gratuito' },
              { value: '∞', label: 'Participantes' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black text-gradient-gold">{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/40 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ── MODOS DE JUEGO ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="badge-primary mb-4 mx-auto w-fit">
              <Gamepad2 className="w-3 h-3" />
              9 Modos de Juego
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              No es un quiz más.
              <br />
              <span className="text-gradient">Es una experiencia.</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Cada modo tiene mecánicas únicas, reglas propias y una interfaz diseñada
              para maximizar el engagement educativo.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAME_MODES.map((mode, i) => (
              <motion.div
                key={mode.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group relative rounded-2xl p-6 border border-white/10 overflow-hidden cursor-pointer
                           hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                {/* Gradiente de fondo al hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                <div className="relative z-10">
                  <div className="text-4xl mb-3">{mode.icon}</div>
                  <h3 className="text-lg font-bold mb-1">{mode.name}</h3>
                  <p className="text-white/50 text-sm">{mode.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PODER DEL DOCENTE ── */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/30" />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              El Docente tiene
              <br />
              <span className="text-gradient-gold">Super Poderes</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Durante las sesiones en vivo, el docente puede otorgar poderes especiales
              a los participantes para hacer el juego más dinámico y sorpresivo.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: '⚡', label: 'Doble Puntos', color: '#F59E0B' },
              { icon: '⏰', label: '+10 Segundos', color: '#3B82F6' },
              { icon: '🛡️', label: 'Escudo', color: '#10B981' },
              { icon: '💡', label: 'Pista', color: '#EAB308' },
              { icon: '✂️', label: '50/50', color: '#EF4444' },
              { icon: '❄️', label: 'Congelar', color: '#06B6D4' },
              { icon: '⭐', label: 'Protagonista', color: '#F59E0B' },
              { icon: '⏭️', label: 'Saltar', color: '#8B5CF6' },
              { icon: '💰', label: '+500 Pts', color: '#F59E0B' },
              { icon: '🚀', label: 'Remontada', color: '#EC4899' },
            ].map((power, i) => (
              <motion.div
                key={power.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10
                           hover:border-white/20 transition-all duration-200 hover:scale-105"
                style={{ background: `${power.color}15` }}
              >
                <span className="text-3xl">{power.icon}</span>
                <span className="text-xs font-semibold text-white/80 text-center">{power.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARACTERÍSTICAS ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Todo lo que necesitas,
              <br />
              <span className="text-gradient">sin costo adicional.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex p-3 rounded-xl ${feat.bg} ${feat.color} mb-4`}>
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QR FLOW ── */}
      <section className="py-20 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Así de simple es
              <br />
              <span className="text-gradient">entrar a jugar</span>
            </h2>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            {[
              { step: '1', icon: '🎮', title: 'Docente crea la partida', desc: 'Selecciona el juego, modo y configuración' },
              { step: '2', icon: '📱', title: 'Se genera el QR', desc: 'Único, seguro y con tiempo de expiración' },
              { step: '3', icon: '📸', title: 'Estudiante escanea', desc: 'Con la cámara normal del celular' },
              { step: '4', icon: '🎯', title: '¡A jugar!', desc: 'Elige apodo, avatar y compite' },
            ].map((s, i) => (
              <div key={s.step} className="flex md:flex-col items-center gap-3 flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
                             border border-purple-500/40 glow-purple"
                  style={{ background: 'rgba(124,58,237,0.15)' }}
                >
                  {s.icon}
                </motion.div>
                <div className="md:text-center">
                  <div className="text-xs text-purple-400 font-bold mb-0.5">PASO {s.step}</div>
                  <div className="font-bold text-sm">{s.title}</div>
                  <div className="text-white/50 text-xs">{s.desc}</div>
                </div>
                {i < 3 && (
                  <ArrowRight className="hidden md:block w-5 h-5 text-white/20 mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTEXTOS DE USO ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-purple-400" />
              <span className="text-white/60">Para todo contexto educativo</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {CONTEXTS.map((ctx) => (
                <span key={ctx} className="badge-primary px-3 py-1.5 text-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  {ctx}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="card border-purple-500/30 p-12" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))' }}>
              <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-float" />
              <h2 className="text-4xl font-black mb-4">
                ¿Listo para transformar
                <br />
                <span className="text-gradient">el aprendizaje?</span>
              </h2>
              <p className="text-white/60 mb-8">
                Crea tu cuenta gratuita y empieza a crear experiencias educativas
                que los estudiantes nunca olvidarán.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="btn-primary text-lg px-8 py-4 rounded-2xl">
                  <Target className="w-5 h-5" />
                  Crear Cuenta Gratis
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-8 py-4 rounded-2xl">
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-4 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Gamepad2 className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-white">AXEL'S PLAY</span>
        </div>
        <p className="text-white/30 text-sm">
          Plataforma educativa interactiva. Gratuita. Sin cobros. Sin trampas.
        </p>
        <p className="text-white/20 text-xs mt-2">
          © 2026 AXEL'S PLAY — Proyecto independiente
        </p>
      </footer>
    </div>
  );
}
