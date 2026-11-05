import { Link } from 'react-router-dom';
import { History, Play, Users, Calendar, Award, ChevronRight } from 'lucide-react';

export default function SessionHistoryPage() {
  const history = [
    {
      id: 'sess-1',
      gameTitle: 'Seguridad Vial y Normas de Tránsito',
      subject: 'Educación Vial',
      date: '01 Nov 2026, 10:30 AM',
      participants: 32,
      winner: 'SuperMate (4,850 pts)',
      mode: 'Batalla en Vivo',
    },
    {
      id: 'sess-2',
      gameTitle: 'Ecosistemas y Biodiversidad',
      subject: 'Ciencias Naturales',
      date: '30 Oct 2026, 02:15 PM',
      participants: 28,
      winner: 'EcoGenio (3,900 pts)',
      mode: 'Supervivencia',
    },
    {
      id: 'sess-3',
      gameTitle: 'Desafío de Lógica y Fracciones',
      subject: 'Matemáticas',
      date: '28 Oct 2026, 09:00 AM',
      participants: 24,
      winner: 'Equipo Alfa (11,200 pts)',
      mode: 'Por Equipos',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Historial de Partidas</h1>
        <p className="text-white/60 text-sm">Registro cronológico de sesiones realizadas con sus resultados</p>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="card p-5 border-white/10 hover:border-purple-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="badge-primary text-[10px]">{item.subject}</span>
                <span className="text-white/40 text-xs flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.date}
                </span>
              </div>
              <h3 className="font-bold text-base text-white">{item.gameTitle}</h3>
              <div className="flex items-center gap-4 text-xs text-white/60 mt-1">
                <span className="flex items-center gap-1 text-purple-300">
                  <Users className="w-3.5 h-3.5" />
                  {item.participants} participantes
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <Award className="w-3.5 h-3.5" />
                  Ganador: {item.winner}
                </span>
              </div>
            </div>

            <Link
              to="/teacher/analytics"
              className="btn-secondary py-2 px-4 rounded-xl text-xs font-semibold self-start md:self-center flex items-center gap-1"
            >
              <span>Ver Analítica</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
