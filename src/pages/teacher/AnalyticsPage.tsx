import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  BarChart3, FileSpreadsheet, FileText,
  Play, BookOpen
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSessionHistoryStore } from '../../stores/sessionHistoryStore';
import { useHomeworkStore } from '../../stores/homeworkStore';

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const { sessions } = useSessionHistoryStore();
  const { assignments } = useHomeworkStore();

  const requestedSessionId = searchParams.get('sessionId');
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    requestedSessionId || (sessions[0]?.id ?? '')
  );

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  // Si no hay sesiones en vivo, calcular métricas globales de deberes si existen
  const totalHomeworkSubmissions = useMemo(() => {
    return assignments.reduce((acc, a) => acc + (a.submissions?.length || 0), 0);
  }, [assignments]);

  const hasData = Boolean(activeSession || totalHomeworkSubmissions > 0);

  // Exportar reporte a Excel
  const handleExportExcel = () => {
    if (!activeSession) return;
    const wsAccuracy = XLSX.utils.json_to_sheet(activeSession.accuracyData || []);
    const wsRankings = XLSX.utils.json_to_sheet(activeSession.rankings || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAccuracy, 'Preguntas');
    XLSX.utils.book_append_sheet(wb, wsRankings, 'Estudiantes');
    XLSX.writeFile(wb, `Reporte_AXELS_PLAY_${activeSession.gameTitle.replace(/\s+/g, '_')}.xlsx`);
  };

  // Exportar reporte a PDF
  const handleExportPDF = () => {
    if (!activeSession) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("AXEL'S PLAY - Reporte Pedagógico de Resultados", 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${activeSession.date} | Actividad: ${activeSession.gameTitle}`, 14, 28);
    doc.text(`Tasa General de Aciertos: ${activeSession.accuracyRate} | Total Participantes: ${activeSession.participants}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Posición', 'Estudiante', 'Puntuación', 'Aciertos', 'Tiempo Promedio']],
      body: (activeSession.rankings || []).map((s) => [s.rank, s.name, s.score, s.aciertos, s.tiempoPromedio]),
      theme: 'grid',
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;

    doc.text('Desglose por Pregunta y Refuerzo Pedagógico:', 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [['Pregunta', 'Aciertos', 'Errores', 'Efectividad']],
      body: (activeSession.accuracyData || []).map((q) => [q.name, q.correctos, q.incorrectos, q.tasa]),
      theme: 'striped',
    });

    doc.save(`Reporte_Pedagogico_${activeSession.gameTitle.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Analítica y Resultados Pedagógicos</h1>
          <p className="text-white/60 text-sm">
            Monitorea el rendimiento, identifica contenidos de refuerzo y exporta informes
          </p>
        </div>

        {hasData && activeSession && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <span>Descargar Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/30"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Selector de Sesión si hay más de una */}
      {sessions.length > 0 && (
        <div className="card p-4 border-white/10 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold text-white/80">Partida Analizada:</span>
          </div>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="input text-xs py-2 px-3 bg-slate-950 border-white/15 text-white rounded-xl focus:border-purple-400"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.gameTitle} ({s.date} · {s.participants} alumnos)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* KPI Cards Dinámicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-white/10">
          <div className="text-xs font-bold text-white/50 uppercase mb-1">Participantes Totales</div>
          <div className="text-3xl font-black text-white">{activeSession ? activeSession.participants : 0}</div>
          <div className="text-[11px] text-green-400 font-semibold mt-1">
            {activeSession ? '100% asistieron por QR o PIN' : 'Sin participantes registrados'}
          </div>
        </div>

        <div className="card p-5 border-white/10">
          <div className="text-xs font-bold text-white/50 uppercase mb-1">Tasa de Acierto Global</div>
          <div className="text-3xl font-black text-purple-400">
            {activeSession ? activeSession.accuracyRate : '0%'}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            {activeSession ? 'Rendimiento general' : 'Sin partidas registradas'}
          </div>
        </div>

        <div className="card p-5 border-white/10">
          <div className="text-xs font-bold text-white/50 uppercase mb-1">Tiempo Promedio Respuesta</div>
          <div className="text-3xl font-black text-blue-400">
            {activeSession ? (activeSession.avgResponseTime || '3.5s') : '0.0s'}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            {activeSession ? 'Agilidad calculada' : 'Sin datos'}
          </div>
        </div>

        <div className="card p-5 border-white/10 border-red-500/30 bg-red-950/20">
          <div className="text-xs font-bold text-red-300 uppercase mb-1">Pregunta Crítica (Refuerzo)</div>
          <div className="text-base font-black text-white truncate">
            {activeSession?.weakestQuestion?.title || 'Ninguna identificada'}
          </div>
          <div className="text-[11px] text-red-400 font-bold mt-1">
            {activeSession?.weakestQuestion?.accuracy
              ? `${activeSession.weakestQuestion.accuracy} de aciertos`
              : 'Sin fallas críticas'}
          </div>
        </div>
      </div>

      {/* ESTADO VACÍO SI SE RESETEARON LAS ESTADÍSTICAS */}
      {!activeSession ? (
        <div className="card p-12 border-dashed border-white/15 text-center flex flex-col items-center justify-center bg-white/[0.01]">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            No hay estadísticas registradas todavía
          </h3>
          <p className="text-white/50 text-xs max-w-md mb-6 leading-relaxed">
            Las estadísticas fueron reseteadas correctamente o aún no has completado partidas. En cuanto inicies una partida en vivo o tus alumnos entreguen deberes, verás aquí el desglose de preguntas, porcentajes de aciertos y análisis pedagógico completo.
          </p>
          <div className="flex gap-3">
            <Link
              to="/teacher/games"
              className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar una Partida</span>
            </Link>
            <Link
              to="/teacher/homework"
              className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Deberes</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Barras: Aciertos vs Errores por Pregunta */}
            <div className="card p-6 border-white/10 lg:col-span-2">
              <h3 className="text-base font-bold text-white mb-1">Rendimiento por Pregunta</h3>
              <p className="text-white/50 text-xs mb-6">Comparación de respuestas correctas e incorrectas</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeSession.accuracyData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} />
                    <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#7c3aed', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="correctos" fill="#10b981" radius={[6, 6, 0, 0]} name="Correctas" />
                    <Bar dataKey="incorrectos" fill="#ef4444" radius={[6, 6, 0, 0]} name="Incorrectas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Circular: Distribución Total */}
            <div className="card p-6 border-white/10 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Distribución de Respuestas</h3>
                <p className="text-white/50 text-xs mb-4">
                  Aciertos globales de la sesión
                </p>

                <div className="h-48 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeSession.pieData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(activeSession.pieData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#7c3aed', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex justify-around text-xs font-bold pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-green-400">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Aciertos ({activeSession.accuracyRate})</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-400">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Errores</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rankings Table */}
          <div className="card p-6 border-white/10">
            <h3 className="text-base font-bold text-white mb-1">Resultados de los Participantes</h3>
            <p className="text-white/50 text-xs mb-4">Clasificación final registrada en la sesión</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-white/60 uppercase font-semibold border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3">Puesto</th>
                    <th className="py-2.5 px-3">Participante</th>
                    <th className="py-2.5 px-3">Puntaje</th>
                    <th className="py-2.5 px-3">Aciertos</th>
                    <th className="py-2.5 px-3">Tiempo Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  {(activeSession.rankings || []).map((s) => (
                    <tr key={s.name} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-bold text-yellow-400">#{s.rank}</td>
                      <td className="py-3 px-3 font-semibold text-white">{s.name}</td>
                      <td className="py-3 px-3 font-bold text-purple-300">{s.score.toLocaleString()} pts</td>
                      <td className="py-3 px-3 text-green-300">{s.aciertos}</td>
                      <td className="py-3 px-3 text-white/60">{s.tiempoPromedio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
