import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Wrench, 
  CheckCheck,
  FileText,
  Sparkles,
  Layers
} from 'lucide-react';
import { PiezaProyecto } from '../../types';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';

export interface EditablePieceRow {
  uid: string; // Identificador único temporal para render y key
  id?: number; // ID en base de datos si ya existe
  nombre: string;
  cantidad: number;
  cantidad_completada: number;
  avance_fabricacion: number;
  estado_montaje: string;
  observaciones: string;
  tipo_material?: string;
  plano_url_1?: string;
  plano_url_2?: string;
  isNew?: boolean;
  isModified?: boolean;
}

interface PiecesEditableTableProps {
  projectId: number;
  initialPieces?: PiezaProyecto[];
  onSaved?: () => void;
  canEdit?: boolean;
}

const ESTADOS_PIEZA = [
  { value: 'Pendiente', label: 'Pendiente', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'En proceso', label: 'En proceso', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'Fabricada', label: 'Fabricada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'En montaje', label: 'En montaje', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'Completada', label: 'Completada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'Rechazada', label: 'Rechazada', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const PiecesEditableTable: React.FC<PiecesEditableTableProps> = ({
  projectId,
  initialPieces = [],
  onSaved,
  canEdit = true
}) => {
  const syncPieces = useSpecialProjectsStore(state => state.syncPieces);

  // Mapear piezas iniciales al modelo editable
  const mapToEditable = (piezas: PiezaProyecto[]): EditablePieceRow[] => {
    return piezas.map(p => {
      const goodCount = p.registros?.reduce((acc, r) => acc + (r.cantidad_buena || 0), 0) || 0;
      const completada = p.cantidad_completada !== undefined 
        ? Number(p.cantidad_completada) 
        : goodCount > 0 
          ? goodCount 
          : Math.round(((p.avance_fabricacion || 0) / 100) * (p.cantidad || 1));

      const requerida = Math.max(1, p.cantidad || 1);
      const avance = Math.min(100, Math.round((completada / requerida) * 100));

      return {
        uid: `db-${p.id}`,
        id: p.id,
        nombre: p.nombre || '',
        cantidad: requerida,
        cantidad_completada: completada,
        avance_fabricacion: avance,
        estado_montaje: p.estado_montaje || 'Pendiente',
        observaciones: p.observaciones || '',
        tipo_material: p.tipo_material || '',
        plano_url_1: p.plano_url_1,
        plano_url_2: p.plano_url_2,
        isNew: false,
        isModified: false
      };
    });
  };

  const [rows, setRows] = useState<EditablePieceRow[]>(() => mapToEditable(initialPieces));
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const isSyncingRef = useRef(false);

  // Sincronizar si cambia el prop initialPieces externo y no hay cambios sucios
  useEffect(() => {
    const hasUnsaved = rows.some(r => r.isModified || r.isNew) || deletedIds.length > 0;
    if (!hasUnsaved) {
      setRows(mapToEditable(initialPieces));
    }
  }, [initialPieces]);

  // Contar cambios pendientes
  const dirtyCount = useMemo(() => {
    const modifiedCount = rows.filter(r => r.isModified || (r.isNew && r.nombre.trim())).length;
    return modifiedCount + deletedIds.length;
  }, [rows, deletedIds]);

  // Cálculos consolidados para footer de estadísticas
  const metrics = useMemo(() => {
    const validRows = rows.filter(r => r.nombre.trim());
    const totalRequerida = validRows.reduce((sum, r) => sum + (Number(r.cantidad) || 0), 0);
    const totalCompletada = validRows.reduce((sum, r) => sum + (Number(r.cantidad_completada) || 0), 0);
    const globalProgress = totalRequerida > 0 ? Math.min(100, Math.round((totalCompletada / totalRequerida) * 100)) : 0;
    const completedCount = validRows.filter(r => r.avance_fabricacion >= 100).length;

    return {
      totalPiezas: validRows.length,
      totalRequerida,
      totalCompletada,
      globalProgress,
      completedCount
    };
  }, [rows]);

  // Modificar campo de una fila con recálculo dinámico de % Avance
  const handleCellChange = (
    uid: string, 
    field: keyof EditablePieceRow, 
    value: any
  ) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.uid !== uid) return row;

      const updated = { ...row, [field]: value, isModified: true };

      // Si cambia la cantidad requerida o la cantidad completada, recalcular % avance en tiempo real
      if (field === 'cantidad' || field === 'cantidad_completada') {
        const req = Math.max(1, Number(field === 'cantidad' ? value : row.cantidad) || 1);
        const comp = Math.max(0, Number(field === 'cantidad_completada' ? value : row.cantidad_completada) || 0);
        const newAvance = Math.min(100, Math.round((comp / req) * 100));
        updated.cantidad = req;
        updated.cantidad_completada = comp;
        updated.avance_fabricacion = newAvance;

        // Auto-sugerir cambio de estado si se completa o si está en proceso
        if (newAvance >= 100 && (row.estado_montaje === 'Pendiente' || row.estado_montaje === 'En proceso')) {
          updated.estado_montaje = 'Fabricada';
        } else if (newAvance > 0 && newAvance < 100 && row.estado_montaje === 'Pendiente') {
          updated.estado_montaje = 'En proceso';
        }
      }

      return updated;
    }));
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  // Agregar una nueva fila limpia
  const handleAddRow = () => {
    const newUid = `new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newRow: EditablePieceRow = {
      uid: newUid,
      nombre: '',
      cantidad: 1,
      cantidad_completada: 0,
      avance_fabricacion: 0,
      estado_montaje: 'Pendiente',
      observaciones: '',
      isNew: true,
      isModified: true
    };
    setRows(prev => [...prev, newRow]);
    setSaveSuccess(false);
  };

  // Eliminar fila
  const handleDeleteRow = (uid: string) => {
    const target = rows.find(r => r.uid === uid);
    if (!target) return;

    if (target.id) {
      setDeletedIds(prev => [...prev, target.id!]);
    }
    setRows(prev => prev.filter(r => r.uid !== uid));
    setSaveSuccess(false);
  };

  // Revertir cambios descartando modificaciones
  const handleDiscardChanges = () => {
    setRows(mapToEditable(initialPieces));
    setDeletedIds([]);
    setErrorMessage(null);
    setSaveSuccess(false);
  };

  // Guardar cambios en base de datos
  const handleSaveChanges = async () => {
    if (isSyncingRef.current || dirtyCount === 0) return;

    const validRows = rows.filter(r => r.nombre.trim());
    if (validRows.length === 0 && rows.length > 0) {
      setErrorMessage('Ingresa el nombre de al menos una pieza antes de guardar.');
      return;
    }

    try {
      isSyncingRef.current = true;
      setSaving(true);
      setErrorMessage(null);

      const payload = validRows.map(r => ({
        id: r.id,
        nombre: r.nombre.trim(),
        cantidad: Number(r.cantidad) || 1,
        cantidad_completada: Number(r.cantidad_completada) || 0,
        avance_fabricacion: Number(r.avance_fabricacion) || 0,
        estado: r.estado_montaje,
        observaciones: r.observaciones?.trim() || null,
        tipo_material: r.tipo_material || null
      }));

      const result = await syncPieces(projectId.toString(), payload, deletedIds);

      // Limpiar estados de dirty
      setRows(mapToEditable(result || []));
      setDeletedIds([]);
      setSaveSuccess(true);
      if (onSaved) onSaved();

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
      isSyncingRef.current = false;
    }
  };

  // Manejar Enter para crear fila rápidamente
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && index === rows.length - 1) {
      e.preventDefault();
      handleAddRow();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
      {/* Header de la Tabla Editable */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-base tracking-tight">Control de Piezas y Avance</h3>
              <span className="px-2 py-0.5 text-xs font-black bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {metrics.totalPiezas} {metrics.totalPiezas === 1 ? 'pieza' : 'piezas'}
              </span>
              {dirtyCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full animate-pulse">
                  <Clock className="w-3 h-3" />
                  {dirtyCount} cambio{dirtyCount > 1 ? 's' : ''} pendiente{dirtyCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Edición en línea directa. Modifica cantidades, estados y notas con cálculo automático de avance.
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <button
              onClick={handleDiscardChanges}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
              title="Descartar cambios no guardados"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Descartar
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-brand-600" />
              Nueva Pieza
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleSaveChanges}
              disabled={saving || dirtyCount === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer ${
                dirtyCount > 0
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                  ¡Guardado!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar Cambios
                  {dirtyCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-black">
                      {dirtyCount}
                    </span>
                  )}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Banner de Errores o Confirmación */}
      {errorMessage && (
        <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-700">✕</button>
        </div>
      )}

      {saveSuccess && (
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Los cambios en las piezas y el avance global del proyecto se han guardado con éxito.</span>
        </div>
      )}

      {/* Tabla con Estilo Grid Moderno */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th className="py-3 px-3 min-w-[220px]">Nombre de Pieza</th>
              <th className="py-3 px-3 w-32 text-center">Cant. Req.</th>
              <th className="py-3 px-3 w-36 text-center">Cant. Completada</th>
              <th className="py-3 px-3 w-40 text-center">Porcentaje Avance</th>
              <th className="py-3 px-3 w-40">Estado</th>
              <th className="py-3 px-3 min-w-[180px]">Observaciones</th>
              <th className="py-3 px-3 w-14 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="font-bold text-slate-600">No hay piezas registradas en este proyecto.</p>
                  <p className="text-xs text-slate-400 mt-1">Haz clic en "+ Nueva Pieza" para añadir la primera pieza.</p>
                  {canEdit && (
                    <button
                      onClick={handleAddRow}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Primera Pieza
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const avance = Number(row.avance_fabricacion) || 0;
                
                // Color de la barra y el porcentaje
                let progressBadgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                let progressBarColor = 'bg-slate-300';
                if (avance >= 100) {
                  progressBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  progressBarColor = 'bg-emerald-500';
                } else if (avance >= 50) {
                  progressBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  progressBarColor = 'bg-blue-500';
                } else if (avance > 0) {
                  progressBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  progressBarColor = 'bg-amber-500';
                }

                return (
                  <tr 
                    key={row.uid}
                    className={`hover:bg-slate-50/70 transition-colors group ${
                      row.isModified ? 'bg-amber-50/30' : ''
                    } ${row.isNew ? 'bg-blue-50/20' : ''}`}
                  >
                    {/* Número e indicador de estado de fila */}
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] relative">
                      {row.isModified && (
                        <span 
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-amber-400 rounded-full" 
                          title="Fila con cambios sin guardar"
                        />
                      )}
                      {index + 1}
                    </td>

                    {/* Nombre de la pieza */}
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={row.nombre}
                        disabled={!canEdit}
                        placeholder="Ej. Eje principal, Soporte A-1..."
                        onKeyDown={e => handleKeyDown(e, index)}
                        onChange={e => handleCellChange(row.uid, 'nombre', e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-bold text-xs outline-none transition-all ${
                          !row.nombre.trim() 
                            ? 'border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:bg-white' 
                            : 'border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:shadow-xs'
                        }`}
                      />
                    </td>

                    {/* Cantidad Requerida */}
                    <td className="py-1.5 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={row.cantidad}
                        disabled={!canEdit}
                        onChange={e => handleCellChange(row.uid, 'cantidad', e.target.value)}
                        className="w-20 px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white text-center font-bold text-xs outline-none transition-all"
                      />
                    </td>

                    {/* Cantidad Completada */}
                    <td className="py-1.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={row.cantidad_completada}
                          disabled={!canEdit}
                          onChange={e => handleCellChange(row.uid, 'cantidad_completada', e.target.value)}
                          className={`w-20 px-2 py-1.5 rounded-lg border font-black text-xs text-center outline-none transition-all ${
                            row.cantidad_completada >= row.cantidad
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 focus:border-emerald-500 focus:bg-white'
                              : row.cantidad_completada > 0
                                ? 'border-blue-200 bg-blue-50/50 text-blue-800 focus:border-blue-500 focus:bg-white'
                                : 'border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white'
                          }`}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">/ {row.cantidad}</span>
                      </div>
                    </td>

                    {/* Columna Calculada: Porcentaje de Avance */}
                    <td className="py-1.5 px-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="w-full flex items-center justify-between gap-2 px-1">
                          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-black ${progressBadgeColor}`}>
                            {avance}%
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {avance >= 100 ? 'Listo' : `${row.cantidad_completada}/${row.cantidad}`}
                          </span>
                        </div>
                        {/* Mini Barra de Progreso Reactiva */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-1.5 px-3">
                      <select
                        value={row.estado_montaje}
                        disabled={!canEdit}
                        onChange={e => handleCellChange(row.uid, 'estado_montaje', e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-lg border font-bold text-xs outline-none cursor-pointer transition-all ${
                          ESTADOS_PIEZA.find(s => s.value === row.estado_montaje)?.color || 'border-slate-200 bg-white'
                        }`}
                      >
                        {ESTADOS_PIEZA.map(s => (
                          <option key={s.value} value={s.value} className="bg-white text-slate-800 font-semibold">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Observaciones */}
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={row.observaciones}
                        disabled={!canEdit}
                        placeholder="Material, notas de maquinado..."
                        onChange={e => handleCellChange(row.uid, 'observaciones', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white text-xs outline-none transition-all placeholder:text-slate-300"
                      />
                    </td>

                    {/* Botón Eliminar Fila */}
                    <td className="py-1.5 px-2 text-center">
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteRow(row.uid)}
                          className="opacity-40 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con Resumen Consolidado y Métricas de Progreso */}
      <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Total Piezas:</span>
            <span className="font-black text-slate-900">{metrics.totalPiezas}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Unidades Requeridas:</span>
            <span className="font-black text-slate-900">{metrics.totalRequerida}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Unidades Fabricadas:</span>
            <span className="font-black text-emerald-700">{metrics.totalCompletada}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Piezas al 100%:</span>
            <span className="font-black text-blue-700">{metrics.completedCount} / {metrics.totalPiezas}</span>
          </div>
        </div>

        {/* Barra de Progreso Global Ponderada */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Avance Global:</span>
          <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden w-28">
            <div 
              className="bg-brand-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${metrics.globalProgress}%` }}
            />
          </div>
          <span className="font-black text-brand-700 text-xs">{metrics.globalProgress}%</span>
        </div>
      </div>
    </div>
  );
};

export default PiecesEditableTable;
