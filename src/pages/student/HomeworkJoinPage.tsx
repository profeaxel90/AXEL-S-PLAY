import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, ArrowRight, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHomeworkStore } from '../../stores/homeworkStore';
import { decodeAssignmentPayload } from '../../lib/assignmentPayload';
import { AVAILABLE_MASCOT_SEEDS } from '../../components/game/MascotAvatar';
import MascotAvatar from '../../components/game/MascotAvatar';

export default function HomeworkJoinPage() {
  const navigate = useNavigate();
  const { pin: paramPin } = useParams<{ pin?: string }>();
  const [searchParams] = useSearchParams();
  const { getAssignmentByIdOrPin, getGroupByIdOrCode } = useHomeworkStore();

  const [step, setStep] = useState<'pin' | 'info'>(paramPin ? 'info' : 'pin');
  const [pin, setPin] = useState(paramPin || '');
  const [pinError, setPinError] = useState('');

  const [fullName, setFullName] = useState('');
  const [gradeGroup, setGradeGroup] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_MASCOT_SEEDS[0]);
  const [avatarPage, setAvatarPage] = useState(0);
  const [infoError, setInfoError] = useState('');

  const AVATARS_PER_PAGE = 5;
  const totalPages = Math.ceil(AVAILABLE_MASCOT_SEEDS.length / AVATARS_PER_PAGE);
  const visibleAvatars = AVAILABLE_MASCOT_SEEDS.slice(avatarPage * AVATARS_PER_PAGE, (avatarPage + 1) * AVATARS_PER_PAGE);

  // Si viene con param pin o payload QR (?hw=...), importarlo y validarlo directo
  useEffect(() => {
    // 1. Desempaquetar datos de asignación embebidos en el QR
    const encodedPayload = searchParams.get('hw') || searchParams.get('data');
    if (encodedPayload) {
      const decoded = decodeAssignmentPayload(encodedPayload);
      if (decoded) {
        useHomeworkStore.getState().importAssignment(decoded);
      }
    }

    if (paramPin) {
      const groupFound = getGroupByIdOrCode(paramPin);
      if (groupFound) {
        navigate(`/homework/group/${groupFound.code}`, { replace: true });
        return;
      }

      // 2. Si es modo preview del docente, omitir registro de estudiante e iniciar
      if (searchParams.get('preview') === 'true') {
        const found = getAssignmentByIdOrPin(paramPin);
        if (found) {
          sessionStorage.setItem('hw_student', JSON.stringify({
            pin: paramPin,
            fullName: 'Vista Previa Docente',
            gradeGroup: 'Profesor / Administrador',
            avatar: 'Lion',
          }));
          navigate(`/homework/play/${paramPin}`);
          return;
        }
      }

      const found = getAssignmentByIdOrPin(paramPin);
      if (!found || found.status === 'closed') {
        setPinError('Esta asignación no existe o ya fue cerrada por el docente.');
        setStep('pin');
      } else {
        setPin(paramPin);
        setStep('info');
      }
    }
  }, [paramPin, searchParams, getAssignmentByIdOrPin, getGroupByIdOrCode, navigate]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const trimmed = pin.trim();
    if (trimmed.length !== 6 || !/^\d+$/.test(trimmed)) {
      setPinError('El PIN debe tener exactamente 6 dígitos.');
      return;
    }

    // Comprobar si es el PIN de un Grupo de Clase
    const groupFound = getGroupByIdOrCode(trimmed);
    if (groupFound) {
      navigate(`/homework/group/${groupFound.code}`);
      return;
    }

    // Comprobar si es el PIN de una asignación individual
    const found = getAssignmentByIdOrPin(trimmed);
    if (!found) {
      setPinError('No se encontró ninguna actividad o grupo con ese PIN. Verifica con tu docente.');
      return;
    }
    if (found.status === 'closed') {
      setPinError('Esta asignación ya está cerrada. Consulta a tu docente.');
      return;
    }
    setStep('info');
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError('');
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setInfoError('Por favor ingresa tu nombre completo (nombre y apellido).');
      return;
    }
    if (!gradeGroup.trim()) {
      setInfoError('Por favor ingresa tu categoría (ej: Primaria, Secundaria, Categoría A, Libre).');
      return;
    }
    // Guardar datos en sessionStorage para la pantalla de juego
    sessionStorage.setItem('hw_student', JSON.stringify({
      pin: pin.trim(),
      fullName: fullName.trim(),
      gradeGroup: gradeGroup.trim(),
      avatar: selectedAvatar,
    }));
    navigate(`/homework/play/${pin.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <div className="font-black text-2xl text-white leading-none">AXEL'S PLAY</div>
              <div className="text-xs text-emerald-400 font-bold tracking-widest">ASIGNACIÓN DE DEBERES</div>
            </div>
          </div>
          <p className="text-white/50 text-sm">Responde a tu propio ritmo, desde casa 🏠</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* PASO 1: PIN */}
          {step === 'pin' && (
            <div className="p-8">
              <h2 className="text-xl font-black text-white mb-1">Ingresa el PIN</h2>
              <p className="text-sm text-white/50 mb-6">Tu docente te proporcionó un código de 6 dígitos</p>

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="784210"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                  className="w-full text-center text-4xl font-black tracking-[0.3em] bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                />

                {pinError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{pinError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pin.length !== 6}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
                >
                  Continuar <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {/* PASO 2: Datos del estudiante */}
          {step === 'info' && (
            <div className="p-8">
              <h2 className="text-xl font-black text-white mb-1">¿Quién eres?</h2>
              <p className="text-sm text-white/50 mb-6">Tu docente usará estos datos para registrar tu entrega</p>

              <form onSubmit={handleInfoSubmit} className="space-y-5">
                {/* Avatar */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wide mb-3">Elige tu mascota</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAvatarPage((p) => Math.max(0, p - 1))}
                      disabled={avatarPage === 0}
                      className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-20"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex-1 flex justify-center gap-2">
                      {visibleAvatars.map((seed) => (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => setSelectedAvatar(seed)}
                          className={`relative p-1.5 rounded-2xl transition-all ${
                            selectedAvatar === seed
                              ? 'ring-2 ring-emerald-400 bg-emerald-500/20'
                              : 'hover:bg-white/10'
                          }`}
                        >
                          <MascotAvatar seed={seed} emotion="idle" size="sm" />
                          {selectedAvatar === seed && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <span className="text-[9px]">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setAvatarPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={avatarPage === totalPages - 1}
                      className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-20"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Avatar seleccionado grande */}
                  <div className="flex justify-center mt-3">
                    <div className="flex flex-col items-center">
                      <MascotAvatar seed={selectedAvatar} emotion="happy" size="lg" />
                      <span className="text-xs text-white/40 mt-1">{selectedAvatar}</span>
                    </div>
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wide mb-1.5">Nombre y Apellidos *</label>
                  <input
                    type="text"
                    placeholder="Ej: Valentina Restrepo Castro"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setInfoError(''); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wide mb-1.5">Categoría *</label>
                  <input
                    type="text"
                    placeholder="Ej: Primaria, Secundaria, Categoría A, Libre..."
                    value={gradeGroup}
                    onChange={(e) => { setGradeGroup(e.target.value); setInfoError(''); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                {infoError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{infoError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {!paramPin && (
                    <button type="button" onClick={() => setStep('pin')} className="py-3 px-4 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 text-sm font-semibold">
                      ← Atrás
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-base hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
                  >
                    ¡Comenzar! <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
