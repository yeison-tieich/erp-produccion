import React, { useState, useEffect } from 'react';
import {
  Truck, Star, Plus, Search, ShieldCheck, AlertTriangle, CheckCircle,
  FileSpreadsheet, ArrowRight, BarChart2, Calendar, Award, XCircle
} from 'lucide-react';
import { qualityService, Supplier } from '../../services/qualityService';

interface ProveedorItem {
  id_proveedor: number;
  nombre: string;
  rfc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  calificacion_calidad?: number;
  estado_aprobacion?: string;
  evaluaciones?: Supplier['evaluaciones'];
}

export const SuppliersQualityPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<ProveedorItem[]>([]);
  const [receptionInspections, setReceptionInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'proveedores' | 'recepciones'>('proveedores');

  // Eval Modal
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<ProveedorItem | null>(null);
  const [evalForm, setEvalForm] = useState({
    periodo: '2026-Q1',
    puntuacion_calidad: 95,
    puntuacion_entrega: 90,
    puntuacion_servicio: 95,
    comentarios: 'Cumplimiento normativo de certificados de molino y tolerancias dimensionales en barras de acero.',
    evaluador: 'Ing. Calidad'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppliersData, inspectionsData] = await Promise.all([
        qualityService.getSuppliers(),
        qualityService.getInspections({ tipo_inspeccion: 'Recepcion' })
      ]);
      setSuppliers(suppliersData.map((supplier) => ({
        ...supplier,
        id_proveedor: supplier.id,
        calificacion_calidad: supplier.calificacion,
      })));
      setReceptionInspections(inspectionsData);
    } catch (err) {
      console.error('Error fetching supplier quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEvalModal = (supplier: ProveedorItem) => {
    setSelectedSupplier(supplier);
    setIsEvalModalOpen(true);
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    try {
      const globalScore = Math.round(
        (Number(evalForm.puntuacion_calidad) * 0.5) +
        (Number(evalForm.puntuacion_entrega) * 0.3) +
        (Number(evalForm.puntuacion_servicio) * 0.2)
      );

      let estado_resultado = 'Aprobado';
      if (globalScore < 70) estado_resultado = 'Bloqueado';
      else if (globalScore < 85) estado_resultado = 'Condicional';

      await qualityService.evaluateSupplier(selectedSupplier.id_proveedor, evalForm.periodo);

      setIsEvalModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar evaluación del proveedor');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (s.rfc && s.rfc.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusBadge = (estado?: string) => {
    switch (estado) {
      case 'Aprobado':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Homologado / Aprobado</span>;
      case 'Condicional':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Condicional (Bajo Plan)</span>;
      case 'Bloqueado':
        return <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Bloqueado</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-bold rounded-full">Pendiente Evaluar</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-600" />
            Calidad de Proveedores y Recepción (ISO 9001 - Cláusula 8.4)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Evaluación y re-evaluación de proveedores críticos, homologación de materia prima e inspección de recepción con certificados de calidad.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{suppliers.length}</div>
            <div className="text-xs text-gray-500">Proveedores Registrados</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {suppliers.filter(s => s.estado_aprobacion === 'Aprobado' || (s.calificacion_calidad || 0) >= 85).length}
            </div>
            <div className="text-xs text-gray-500">Proveedores Aprobados</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {receptionInspections.length}
            </div>
            <div className="text-xs text-gray-500">Inspecciones en Recepción</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {receptionInspections.filter(i => i.resultado === 'Rechazado').length}
            </div>
            <div className="text-xs text-gray-500">Lotes Rechazados en Entrada</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('proveedores')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'proveedores'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Award className="w-4 h-4" />
          Evaluación de Desempeño y Homologación
        </button>
        <button
          onClick={() => setActiveTab('recepciones')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'recepciones'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Historial de Inspecciones de Materia Prima
        </button>
      </div>

      {/* TAB 1: Proveedores & Evaluaciones */}
      {activeTab === 'proveedores' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proveedor o RFC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Proveedor</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">RFC / Identificación</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Contacto</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Índice Calidad (IQ)</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Estatus ISO 9001</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Cargando proveedores...
                      </td>
                    </tr>
                  ) : filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No se encontraron proveedores registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => (
                      <tr key={sup.id_proveedor} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {sup.nombre}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600">
                          {sup.rfc || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{sup.contacto || 'Sin contacto directo'}</div>
                          <div className="text-xs text-gray-400">{sup.telefono || sup.email || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-bold text-base ${
                            (sup.calificacion_calidad || 100) >= 85
                              ? 'text-emerald-600'
                              : (sup.calificacion_calidad || 100) >= 70
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}>
                            {sup.calificacion_calidad ? `${Number(sup.calificacion_calidad).toFixed(0)}%` : '100%'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(sup.estado_aprobacion || 'Aprobado')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenEvalModal(sup)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Evaluar Desempeño
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Historial de Inspecciones de Recepción */}
      {activeTab === 'recepciones' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">
              Control de Calidad en Recepción de Materias Primas e Insumos
            </h3>
            <p className="text-xs text-gray-500">
              Registros generados con certificados de molino, dureza, composición química y dimensiones de entrada.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Lote Inspeccionado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Materia Prima</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Certificado Molino</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Cant. Aceptada</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Cant. Rechazada</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receptionInspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No hay registros de inspección de recepción de materia prima.
                    </td>
                  </tr>
                ) : (
                  receptionInspections.map((insp) => (
                    <tr key={insp.id_inspeccion} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(insp.fecha_inspeccion).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {insp.lote_materia_prima || 'L-RAW-001'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {insp.materia_prima?.nombre || 'Barra de Acero AISI 4140'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                        {insp.certificado_calidad_url ? (
                          <a
                            href={insp.certificado_calidad_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            Ver Certificado
                          </a>
                        ) : (
                          'Adjunto en Ficha'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">
                        {insp.cantidad_aprobada || 0}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">
                        {insp.cantidad_rechazada || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          insp.resultado === 'Aprobado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : insp.resultado === 'Aprobado_Condicional'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {insp.resultado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Evaluate Supplier */}
      {isEvalModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Evaluación de Desempeño ISO 9001
                </h2>
                <p className="text-xs text-gray-500">{selectedSupplier.nombre}</p>
              </div>
              <button
                onClick={() => setIsEvalModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Período de Evaluación
                  </label>
                  <input
                    type="text"
                    required
                    value={evalForm.periodo}
                    onChange={(e) => setEvalForm({ ...evalForm, periodo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Evaluador
                  </label>
                  <input
                    type="text"
                    required
                    value={evalForm.evaluador}
                    onChange={(e) => setEvalForm({ ...evalForm, evaluador: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Calidad de Materiales y Certificados (50% ponderado)</span>
                  <span className="font-bold text-indigo-600">{evalForm.puntuacion_calidad} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evalForm.puntuacion_calidad}
                  onChange={(e) => setEvalForm({ ...evalForm, puntuacion_calidad: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Cumplimiento en Tiempos de Entrega (30% ponderado)</span>
                  <span className="font-bold text-indigo-600">{evalForm.puntuacion_entrega} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evalForm.puntuacion_entrega}
                  onChange={(e) => setEvalForm({ ...evalForm, puntuacion_entrega: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Servicio, Garantía y Soporte Técnico (20% ponderado)</span>
                  <span className="font-bold text-indigo-600">{evalForm.puntuacion_servicio} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evalForm.puntuacion_servicio}
                  onChange={(e) => setEvalForm({ ...evalForm, puntuacion_servicio: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Calculated Score Preview */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-700 font-semibold">Índice Global Calculado (IQ):</div>
                  <div className="text-xs text-indigo-600">
                    {Math.round(
                      (Number(evalForm.puntuacion_calidad) * 0.5) +
                      (Number(evalForm.puntuacion_entrega) * 0.3) +
                      (Number(evalForm.puntuacion_servicio) * 0.2)
                    ) >= 85
                      ? 'Calificación: HOMOLOGADO / APROBADO'
                      : 'Calificación: CONDICIONAL / REQUIERE PLAN'}
                  </div>
                </div>
                <div className="text-2xl font-bold text-indigo-800">
                  {Math.round(
                    (Number(evalForm.puntuacion_calidad) * 0.5) +
                    (Number(evalForm.puntuacion_entrega) * 0.3) +
                    (Number(evalForm.puntuacion_servicio) * 0.2)
                  )}%
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observaciones y Conclusiones de Auditoría
                </label>
                <textarea
                  rows={2}
                  value={evalForm.comentarios}
                  onChange={(e) => setEvalForm({ ...evalForm, comentarios: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-sm"
                >
                  Registrar Evaluación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
