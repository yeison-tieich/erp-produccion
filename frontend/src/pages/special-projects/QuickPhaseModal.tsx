import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { FaseProyecto } from '../../types';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';

interface QuickPhaseModalProps {
  projectId: number;
  phase: FaseProyecto;
  onClose: () => void;
}

const phaseStates = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'En Progreso', label: 'Iniciar' },
  { value: 'Completada', label: 'Completar' },
];

const QuickPhaseModal: React.FC<QuickPhaseModalProps> = ({ projectId, phase, onClose }) => {
  const updatePhase = useSpecialProjectsStore(state => state.quickUpdatePhase);
  const addPieceRecord = useSpecialProjectsStore(state => state.addPieceRecord);
  const pieces = useSpecialProjectsStore(state => state.project?.piezas || []);
  const projectStatus = useSpecialProjectsStore(state => state.project?.estado);
  const [note, setNote] = useState(phase.observaciones || '');
  const [pieceId, setPieceId] = useState('');
  const [quantities, setQuantities] = useState({ good: '0', scrap: '0', rework: '0' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastSubmission, setLastSubmission] = useState({ requestId: '', snapshot: '' });
  const isLocked = projectStatus === 'Verificación' || projectStatus === 'Finalizado';

  const saveProductionReport = async () => {
    const amount = Number(quantities.good) + Number(quantities.scrap) + Number(quantities.rework);
    if (!pieceId || amount <= 0 || !Number.isInteger(amount)) {
      setError('Selecciona una pieza y registra una cantidad entera mayor que cero.');
      return;
    }

    setSaving(true);
    setError('');
    const snapshot = JSON.stringify({ pieceId, quantities, note });
    const requestId = lastSubmission.snapshot === snapshot && lastSubmission.requestId
      ? lastSubmission.requestId
      : crypto.randomUUID();
    setLastSubmission({ requestId, snapshot });
    try {
      await addPieceRecord(pieceId, {
        tipo: 'FABRICACION',
        descripcion: note.trim() || 'Reporte de producción',
        cantidad_buena: Number(quantities.good),
        cantidad_mala: Number(quantities.scrap),
        cantidad_retrabajo: Number(quantities.rework),
        clave_idempotencia: requestId,
      });
      onClose();
    } catch (saveError: any) {
      setError(saveError.response?.data?.message || saveError.message || 'No se pudo registrar la producción.');
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async (status: string) => {
    setSaving(true);
    setError('');
    try {
      await updatePhase(projectId.toString(), phase.id.toString(), {
        estado: status,
        observaciones: note.trim() || null,
      });
      onClose();
    } catch (saveError: any) {
      setError(saveError.response?.data?.message || saveError.message || 'No se pudo actualizar la fase.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="quick-phase-title">
      <section className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Actualización rápida</p>
            <h2 id="quick-phase-title" className="mt-1 text-xl font-black text-slate-900">{phase.nombre}</h2>
            <p className="mt-1 text-sm text-slate-500">Estado actual: {phase.estado}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        {phase.nombre === 'Fabricación' && pieces.length > 0 && !isLocked && (
          <div className="mb-5 space-y-3 rounded-xl bg-teal-50 p-4">
            <label htmlFor="quick-phase-piece" className="block text-sm font-bold text-slate-800">Pieza fabricada</label>
            <select id="quick-phase-piece" value={pieceId} onChange={event => setPieceId(event.target.value)} className="min-h-12 w-full rounded-lg border border-teal-200 bg-white px-3 font-semibold">
              <option value="">Selecciona una pieza…</option>
              {pieces.map(piece => <option key={piece.id} value={piece.id}>{piece.codigo ? `${piece.codigo} · ` : ''}{piece.nombre} ({piece.cantidad} plan.)</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['good', 'Buenas'],
                ['scrap', 'Rechazo'],
                ['rework', 'Retrabajo'],
              ] as const).map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-slate-600">
                  {label}
                  <input type="number" min="0" step="1" value={quantities[key]} onChange={event => setQuantities(current => ({ ...current, [key]: event.target.value }))} className="mt-1 min-h-12 w-full rounded-lg border border-slate-200 px-3 text-center text-base text-slate-900" />
                </label>
              ))}
            </div>
            <button type="button" onClick={saveProductionReport} disabled={saving} className="min-h-12 w-full rounded-lg bg-teal-700 px-4 font-bold text-white hover:bg-teal-800 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Registrar cantidades'}
            </button>
          </div>
        )}

        <label htmlFor="quick-phase-note" className="mb-2 block text-sm font-bold text-slate-700">Nota de turno (opcional)</label>
        <textarea
          id="quick-phase-note"
          value={note}
          onChange={event => setNote(event.target.value)}
          rows={3}
          disabled={isLocked}
          className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        />

        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        {isLocked ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">El proyecto está bloqueado para cambios.</p>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {phaseStates.map(state => (
              <button
                key={state.value}
                type="button"
                disabled={saving || phase.estado === state.value}
                onClick={() => saveStatus(state.value)}
                className={`min-h-12 rounded-lg px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                  state.value === 'Completada' ? 'bg-teal-700 text-white hover:bg-teal-800' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {state.value === 'Completada' && <Check className="mr-1 inline h-4 w-4" />}
                {saving ? 'Guardando…' : state.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default QuickPhaseModal;
