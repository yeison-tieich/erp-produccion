import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Filter, History, Eye, CheckCircle, AlertCircle,
  Download, Upload, Tag, Calendar, User, ArrowUpRight, Clock, ShieldCheck
} from 'lucide-react';
import { qualityService } from '../../services/qualityService';

export const DocumentsSGCPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // Modals
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // New Doc Form
  const [newDocForm, setNewDocForm] = useState({
    codigo: '',
    titulo: '',
    tipo: 'Procedimiento',
    proceso_asociado: 'Producción',
    version_actual: '1.0',
    descripcion: '',
    responsable_elaboracion: '',
    responsable_aprobacion: '',
    archivo_url: '',
    motivo_cambio: 'Versión inicial aprobada para implementación SGC ISO 9001:2015'
  });

  // New Version Form
  const [newVersionForm, setNewVersionForm] = useState({
    version: '',
    motivo_cambio: '',
    archivo_url: '',
    cambios_principales: '',
    elaborado_por: '',
    aprobado_por: ''
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await qualityService.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching SGC documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await qualityService.createDocument(newDocForm);
      setIsNewDocModalOpen(false);
      setNewDocForm({
        codigo: '',
        titulo: '',
        tipo: 'Procedimiento',
        proceso_asociado: 'Producción',
        version_actual: '1.0',
        descripcion: '',
        responsable_elaboracion: '',
        responsable_aprobacion: '',
        archivo_url: '',
        motivo_cambio: 'Versión inicial aprobada para implementación SGC ISO 9001:2015'
      });
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear documento SGC');
    }
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      await qualityService.createDocumentVersion(selectedDoc.id, newVersionForm);
      setIsVersionModalOpen(false);
      setNewVersionForm({
        version: '',
        motivo_cambio: '',
        archivo_url: '',
        cambios_principales: '',
        elaborado_por: '',
        aprobado_por: ''
      });
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al registrar nueva versión');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchSearch = doc.codigo.toLowerCase().includes(search.toLowerCase()) ||
      doc.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (doc.proceso_asociado && doc.proceso_asociado.toLowerCase().includes(search.toLowerCase()));
    const matchTipo = tipoFilter ? doc.tipo === tipoFilter : true;
    const matchEstado = estadoFilter ? doc.estado === estadoFilter : true;
    return matchSearch && matchTipo && matchEstado;
  });

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'Manual': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Procedimiento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Instructivo': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Formato': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Politica': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            Información Documentada SGC (ISO 9001 - Cláusula 7.5)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Control maestro de procedimientos, manuales, instructivos y formatos vigentes con historial auditable de versiones.
          </p>
        </div>
        <button
          onClick={() => setIsNewDocModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Documento
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
            <div className="text-xs text-gray-500">Documentos Totales</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {documents.filter(d => d.estado === 'Vigente').length}
            </div>
            <div className="text-xs text-gray-500">Vigentes y Aprobados</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {documents.filter(d => d.estado === 'En Revision').length}
            </div>
            <div className="text-xs text-gray-500">En Revisión</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">100%</div>
            <div className="text-xs text-gray-500">Trazabilidad ISO 9001</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, título, proceso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">Todos los Tipos</option>
            <option value="Manual">Manual</option>
            <option value="Procedimiento">Procedimiento</option>
            <option value="Instructivo">Instructivo</option>
            <option value="Formato">Formato</option>
            <option value="Politica">Política</option>
          </select>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="Vigente">Vigente</option>
            <option value="En Revision">En Revisión</option>
            <option value="Obsoleto">Obsoleto</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Título del Documento</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Proceso</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Versión</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Aprobado Por</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Cargando información documentada SGC...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron documentos registrados.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id_documento} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                      {doc.codigo}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div>{doc.titulo}</div>
                      {doc.descripcion && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">{doc.descripcion}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getTipoBadge(doc.tipo)}`}>
                        {doc.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {doc.proceso_asociado || 'General'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-gray-700">
                      v{doc.version_actual}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="text-xs font-medium">{doc.responsable_aprobacion || 'Comité de Calidad'}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(doc.fecha_aprobacion).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        doc.estado === 'Vigente'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.estado === 'En Revision'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.archivo_url && (
                          <a
                            href={doc.archivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver Archivo Digital"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsVersionModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                          Versiones ({doc.historial_versiones?.length || 1})
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New SGC Document */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Alta de Información Documentada SGC
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              El documento ingresará con estado Vigente y quedará registrado en el inventario oficial ISO 9001.
            </p>

            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Código Documental *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: PR-CAL-001"
                    value={newDocForm.codigo}
                    onChange={(e) => setNewDocForm({ ...newDocForm, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={newDocForm.tipo}
                    onChange={(e) => setNewDocForm({ ...newDocForm, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Procedimiento">Procedimiento</option>
                    <option value="Instructivo">Instructivo</option>
                    <option value="Formato">Formato</option>
                    <option value="Politica">Política</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título del Documento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Procedimiento de Liberación y Control Dimensional de Piezas"
                  value={newDocForm.titulo}
                  onChange={(e) => setNewDocForm({ ...newDocForm, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Proceso Asociado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Producción / Maquinado CNC"
                    value={newDocForm.proceso_asociado}
                    onChange={(e) => setNewDocForm({ ...newDocForm, proceso_asociado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Versión Inicial
                  </label>
                  <input
                    type="text"
                    placeholder="1.0"
                    value={newDocForm.version_actual}
                    onChange={(e) => setNewDocForm({ ...newDocForm, version_actual: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Elaborado / Responsable
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre o Puesto del autor"
                    value={newDocForm.responsable_elaboracion}
                    onChange={(e) => setNewDocForm({ ...newDocForm, responsable_elaboracion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Aprobado Por
                  </label>
                  <input
                    type="text"
                    placeholder="Gerente de Calidad / Operaciones"
                    value={newDocForm.responsable_aprobacion}
                    onChange={(e) => setNewDocForm({ ...newDocForm, responsable_aprobacion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Enlace al Archivo Digital / PDF / OneDrive
                </label>
                <input
                  type="url"
                  placeholder="https://cloud.mecaytro.com/sgc/PR-CAL-001.pdf"
                  value={newDocForm.archivo_url}
                  onChange={(e) => setNewDocForm({ ...newDocForm, archivo_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Objetivo / Descripción Breve
                </label>
                <textarea
                  rows={2}
                  placeholder="Alcance y objetivo general del documento..."
                  value={newDocForm.descripcion}
                  onChange={(e) => setNewDocForm({ ...newDocForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm"
                >
                  Registrar Documento SGC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Version History & New Version */}
      {isVersionModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-600 text-lg">
                    {selectedDoc.codigo}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getTipoBadge(selectedDoc.tipo)}`}>
                    {selectedDoc.tipo}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Actual: v{selectedDoc.version_actual}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedDoc.titulo}</h2>
              </div>
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Version History List */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Historial Auditable de Cambios y Versiones
              </h3>
              <div className="space-y-3">
                {selectedDoc.historial_versiones && selectedDoc.historial_versiones.length > 0 ? (
                  selectedDoc.historial_versiones.map((v) => (
                    <div key={v.id_historial} className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 border rounded text-xs">
                            v{v.version}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(v.fecha_cambio).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          Aprobado por: {v.aprobado_por || 'Comité SGC'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mt-2 font-medium">
                        {v.motivo_cambio}
                      </div>
                      {v.cambios_principales && (
                        <div className="text-xs text-gray-500 mt-1">
                          Detalle: {v.cambios_principales}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-400 text-xs">
                    Sin revisiones previas (Versión actual es la primera registrada).
                  </div>
                )}
              </div>
            </div>

            {/* Form: Add New Version */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Publicar Nueva Versión
              </h3>
              <form onSubmit={handleAddVersion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nueva Versión *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 2.0 o 1.1"
                      value={newVersionForm.version}
                      onChange={(e) => setNewVersionForm({ ...newVersionForm, version: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Aprobado Por *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del responsable de aprobación"
                      value={newVersionForm.aprobado_por}
                      onChange={(e) => setNewVersionForm({ ...newVersionForm, aprobado_por: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Motivo del Cambio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Actualización de tolerancias de acuerdo a solicitud de cliente"
                    value={newVersionForm.motivo_cambio}
                    onChange={(e) => setNewVersionForm({ ...newVersionForm, motivo_cambio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Resumen de Modificaciones Principales
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Especificar los cambios de secciones, adición de cláusulas..."
                    value={newVersionForm.cambios_principales}
                    onChange={(e) => setNewVersionForm({ ...newVersionForm, cambios_principales: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nuevo Enlace a Archivo Vigente
                  </label>
                  <input
                    type="url"
                    placeholder="https://cloud.mecaytro.com/sgc/PR-CAL-001_v2.pdf"
                    value={newVersionForm.archivo_url}
                    onChange={(e) => setNewVersionForm({ ...newVersionForm, archivo_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-1.5"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Actualizar a Versión v{newVersionForm.version || 'X'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
