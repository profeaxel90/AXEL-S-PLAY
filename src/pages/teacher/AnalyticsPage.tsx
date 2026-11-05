import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  BarChart3, Download, FileSpreadsheet, FileText, AlertTriangle,
  CheckCircle2, Users, Clock, Award, HelpCircle, ArrowUpRight
} from 'lucide-react';

export default function AnalyticsPage() {
  const [selectedSession, setSelectedSession] = useState('sess-1');

  // Datos estadísticos simulados para la sesión
  const accuracyData = [
    { name: 'P1: Señal Octagonal', correctos: 28, incorrectos: 4, tasa: '87.5%' },
    { name: 'P2: Cinturón Trasero', correctos: 22, incorrectos: 10, tasa: '68.7%' },
    { name: 'P3: Límites Residenciales', correctos: 14, incorrectos: 18, tasa: '43.7%' },
    { name: 'P4: Luces en Niebla', correctos: 26, incorrectos: 6, tasa: '81.2%' },
    { name: 'P5: Prioridad Rotonda', correctos: 11, incorrectos: 21, tasa: '34.3%' },
  ];

  const pieData = [
    { name: 'Aciertos', value: 101, color: '#10b981' },
    { name: 'Errores', value: 59, color: '#ef4444' },
  ];

  const studentRankings = [
    { rank: 1, name: 'SuperMate', score: 4850, aciertos: '5/5', tiempoPromedio: '3.4s' },
    { rank: 2, name: 'VelocidadPro', score: 4400, aciertos: '4/5', tiempoPromedio: '2.8s' },
    { rank: 3, name: 'EcoGenio', score: 4100, aciertos: '4/5', tiempoPromedio: '4.1s' },
    { rank: 4, name: 'RayoCosmico', score: 3850, aciertos: '4/5', tiempoPromedio: '5.0s' },
    { rank: 5, name: 'SabioAstral', score: 3200, aciertos: '3/5', tiempoPromedio: '6.2s' },
  ];

  // Exportar reporte a Excel
  const handleExportExcel = () => {
    const wsAccuracy = XLSX.utils.json_to_sheet(accuracyData);
    const wsRankings = XLSX.utils.json_to_sheet(studentRankings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAccuracy, 'Preguntas');
    XLSX.utils.book_append_sheet(wb, wsRankings, 'Estudiantes');
    XLSX.writeFile(wb, 'Reporte_AXEL_PLAY_Sesion.xlsx');
  };

  // Exportar reporte a PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('AXEL PLAY - Reporte Pedagógico de Resultados', 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()} | Actividad: Seguridad Vial`, 14, 28);
    doc.text('Tasa General de Aciertos: 63.1% | Total Participantes: 32', 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Posición', 'Estudiante', 'Puntuación', 'Aciertos', 'Tiempo Promedio']],
      body: studentRankings.map((s) => [s.rank, s.name, s.score, s.aciertos, s.tiempoPromedio]),
      theme: 'grid',
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;

    doc.text('Desglose por Pregunta y Refuerzo Pedagógico:', 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [['Pregunta', 'Aciertos', 'Errores', 'Efectividad']],
      body: accuracyData.map((q) => [q.name, q.correctos, q.incorrectos, q.tasa]),
      theme: 'striped',
    });

    doc.save('Reporte_Pedagogico_AXEL_PLAY.pdf');
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-white/10">
          <div className="text-xs font-bold text-white/50 uppercase mb-1">Participantes Totales</div>
          <div className="text-3xl font-black text-white">32</div>
          <div className="text-[11px] text-green-400 font-semibold mt-1">100% asistieron por QR</div>
        </div>

        <div className="card p-5 border-white/10">
          <div className="text-xs font-bold text-white/50 uppercase mb-1">Tasa de Acierto Global</div>
          <div className="text-3xl font-black text-purple-400">63.1%</div>
          <div className="text-[11px] text-white/50 mt-1">Promedio aceptable</div>
        </div>

        <div className="card p-5 border-white/10">
          <div className="text-xs font-bold text-white/50 uppercase mb-1">Tiempo Promedio Respuesta</div>
          <div className="text-3xl font-black text-blue-400">4.3s</div>
          <div className="text-[11px] text-white/50 mt-1">Alta agilidad mental</div>
        </div>

        <div className="card p-5 border-white/10 border-red-500/30 bg-red-950/20">
          <div className="text-xs font-bold text-red-300 uppercase mb-1">Pregunta Crítica (Refuerzo)</div>
          <div className="text-base font-black text-white truncate">Prioridad en Rotondas</div>
          <div className="text-[11px] text-red-400 font-bold mt-1">Solo 34.3% de aciertos</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras: Aciertos vs Errores por Pregunta */}
        <div className="card p-6 border-white/10 lg:col-span-2">
          <h3 className="text-base font-bold text-white mb-1">Rendimiento por Pregunta</h3>
          <p className="text-white/50 text-xs mb-6">Comparación de respuestas correctas e incorrectas</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <p className="text-white/50 text-xs mb-4">Total de 160 respuestas emitidas</p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
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
              <span>Correctas (63%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Incorrectas (37%)</span>
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
              {studentRankings.map((s) => (
                <tr key={s.name} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-bold text-yellow-400">#{s.rank}</td>
                  <td className="py-3 px-3 font-semibold text-white">{s.name}</td>
                  <td className="py-3 px-3 font-bold text-purple-300">{s.score} pts</td>
                  <td className="py-3 px-3 text-green-300">{s.aciertos}</td>
                  <td className="py-3 px-3 text-white/60">{s.tiempoPromedio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
