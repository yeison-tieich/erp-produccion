import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Plus, Search, AlertCircle, CheckCircle2, Clock,
  DollarSign, UserCheck, RefreshCw, FileText, ChevronRight, Building
} from 'lucide-react';
import { qualityService } from '../../services/qualityService';

export const CustomerClaimsPage: React.FC = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // Modals
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);

  // Forms
  const [newClaimForm, setNewClaimForm] = useState({
    codigo_reclamo: '',
    id_cliente: 1,
    id_orden: '',
    motivo: '',
    descripcion_falla: '',
    costo_asociado: 0,
    accion_inmediata: '',
    responsable: 'Dpto. Calidad'
  });

  const [resolveForm, setResolveForm] = useState({
    estado: 'Cerrado',
    satisfaccion_cliente: 'Satisfecho',
    costo_asociado: 0,
    solucion_final: ''
  });

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const data = await qualityService.getClaims();
      setClaims(data);
    } catch (err) {
      console.error('Error fetching customer claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await qualityService.createClaim({
        ...newClaimForm,
        id_cliente: Number(newClaimForm.id_cliente),
        id_orden: newClaimForm.id_orden ? Number(newClaimForm.id_orden) : undefined,
        costo_asociado: Number(newClaimForm.costo_asociado)
      });
      setIsNewClaimModalOpen(false);
      setNewClaimForm({
        codigo_reclamo: '',
        id_cliente: 1,
        id_orden: '',
        motivo: '',
        descripcion_falla: '',
        costo_asociado: 0,
        accion_inmediata: '',
        responsable: 'Dpto. Calidad'
      });
      fetchClaims();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al registrar reclamo de cliente');
    }
  };

  const handleResolveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      await qualityService.updateClaim(selectedClaim.id, {
        estado: resolveForm.estado,
        satisfaccion_cliente: resolveForm.satisfaccion_cliente,
        costo_asociado: Number(resolveForm.costo_asociado),
        solucion_final: resolveForm.solucion_final,
        fecha_cierre: new Date()
      });
      setIsResolveModalOpen(false);
      fetchClaims();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al resolver reclamo');
    }
  };

  const filteredClaims = claims.filter(c => {
    const matchSearch = c.codigo_reclamo.toLowerCase().includes(search.toLowerCase()) ||
      c.motivo.toLowerCase().includes(search.toLowerCase()) ||
      (c.cliente?.nombre && c.cliente.nombre.toLowerCase().includes(search.toLowerCase()));
    const matchEstado = estadoFilter ? c.estado === estadoFilter : true;
    return matchSearch && matchEstado;
  });

  const totalCost = claims.reduce((acc, curr) => acc + (Number(curr.costo_asociado) || 0), 0);
  const openClaimsCount = claims.filter(c => c.estado !== 'Cerrado' && c.estado !== 'Resuelto').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-indigo-600" />
            Reclamos y Quejas de Clientes (ISO 9001 - Cláusula 9.1.2 / 10.2)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Recepción, contención inmediata, análisis de causa raíz, reposición y evaluación de satisfacción final del cliente.
          </p>
        </div>
        <button
          onClick={() => {
            const nextCode = `REC-${new Date().getFullYear()}-${String(claims.length + 1).padStart(3, '0')}`;
            setNewClaimForm(prev => ({ ...prev, codigo_reclamo: nextCode }));
            setIsNewClaimModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Reclamo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{claims.length}</div>
            <div className="text-xs text-gray-500">Total Reclamos Registrados</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{openClaimsCount}</div>
            <div className="text-xs text-gray-500">Casos Abiertos / En Gestión</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {claims.filter(c => c.estado === 'Cerrado' || c.estado === 'Resuelto').length}
            </div>
            <div className="text-xs text-gray-500">Cerrados Satisfechos</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-gray-500">Costo No-Calidad Externo</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, cliente o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full md:w-auto"
        >
          <option value="">Todos los Estados</option>
          <option value="Abierto">Abierto</option>
          <option value="En Analisis">En Análisis</option>
          <option value="Accion Correctiva">Acción Correctiva (CAPA)</option>
          <option value="Resuelto">Resuelto</option>
          <option value="Cerrado">Cerrado</option>
        </select>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Motivo de Reclamo</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">OT Afectada</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Costo Asociado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Satisfacción</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Cargando reclamos de clientes...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron registros de reclamos.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id_reclamo} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                      {claim.codigo_reclamo}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        {claim.cliente?.nombre || 'Cliente General'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{claim.motivo}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{claim.descripcion_falla}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-gray-600">
                      {claim.orden_trabajo ? `#${claim.orden_trabajo.numero_orden}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                      ${Number(claim.costo_asociado || 0).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        claim.estado === 'Cerrado' || claim.estado === 'Resuelto'
                          ? 'bg-emerald-100 text-emerald-800'
                          : claim.estado === 'Accion Correctiva'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {claim.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-gray-700">
                        {claim.satisfaccion_cliente || 'Pendiente Encuesta'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {claim.estado !== 'Cerrado' && (
                        <button
                          onClick={() => {
                            setSelectedClaim(claim);
                            setResolveForm({
                              estado: 'Cerrado',
                              satisfaccion_cliente: 'Satisfecho',
                              costo_asociado: Number(claim.costo_asociado || 0),
                              solucion_final: ''
                            });
                            setIsResolveModalOpen(true);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Cerrar / Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Customer Claim */}
      {isNewClaimModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              Recepción y Apertura de Reclamo de Cliente
            </h2>
            <p className="text-xs text-gray-500">
              Registrar la no-conformidad manifestada por el cliente para iniciar contención inmediata y trazabilidad.
            </p>

            <form onSubmit={handleCreateClaim} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Código de Reclamo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClaimForm.codigo_reclamo}
                    onChange={(e) => setNewClaimForm({ ...newClaimForm, codigo_reclamo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ID Orden de Trabajo (OT)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 1"
                    value={newClaimForm.id_orden}
                    onChange={(e) => setNewClaimForm({ ...newClaimForm, id_orden: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Motivo Resumido del Reclamo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Eje con cota externa fuera de tolerancia dimensional"
                  value={newClaimForm.motivo}
                  onChange={(e) => setNewClaimForm({ ...newClaimForm, motivo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción Detallada del Defecto
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explicar las piezas recibidas por el cliente, número de lote, desviación reportada..."
                  value={newClaimForm.descripcion_falla}
                  onChange={(e) => setNewClaimForm({ ...newClaimForm, descripcion_falla: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Acción Inmediata de Contención (ISO 9001)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Reposición inmediata sin costo enviada por flete urgente. Retención de lote remanente en planta."
                  value={newClaimForm.accion_inmediata}
                  onChange={(e) => setNewClaimForm({ ...newClaimForm, accion_inmediata: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estimación Costo No-Calidad ($)
                  </label>
                  <input
                    type="number"
                    value={newClaimForm.costo_asociado}
                    onChange={(e) => setNewClaimForm({ ...newClaimForm, costo_asociado: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Responsable de Seguimiento
                  </label>
                  <input
                    type="text"
                    value={newClaimForm.responsable}
                    onChange={(e) => setNewClaimForm({ ...newClaimForm, responsable: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewClaimModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-sm"
                >
                  Abrir Expediente Reclamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve / Close Claim */}
      {isResolveModalOpen && selectedClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Cierre y Evaluación de Satisfacción
                </h2>
                <p className="text-xs text-gray-500 font-mono">{selectedClaim.codigo_reclamo}</p>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Solución Final Otorgada al Cliente *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej: Se entregó nuevo lote verificado al 100%, se reembolsó flete y el cliente validó ensamble satisfactorio."
                  value={resolveForm.solucion_final}
                  onChange={(e) => setResolveForm({ ...resolveForm, solucion_final: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nivel de Satisfacción del Cliente
                  </label>
                  <select
                    value={resolveForm.satisfaccion_cliente}
                    onChange={(e) => setResolveForm({ ...resolveForm, satisfaccion_cliente: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-medium"
                  >
                    <option value="Muy Satisfecho">Muy Satisfecho</option>
                    <option value="Satisfecho">Satisfecho</option>
                    <option value="Aceptable">Aceptable</option>
                    <option value="Insatisfecho">Insatisfecho</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Costo Total Definitivo ($)
                  </label>
                  <input
                    type="number"
                    value={resolveForm.costo_asociado}
                    onChange={(e) => setResolveForm({ ...resolveForm, costo_asociado: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold shadow-sm"
                >
                  Cerrar Reclamo Conforme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
