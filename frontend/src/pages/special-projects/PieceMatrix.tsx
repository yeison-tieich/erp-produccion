import React, { useState } from 'react';
import { Check, Plus, Trash2, Upload, X } from 'lucide-react';
import { useSpecialProjectsStore } from '../../store/specialProjects.store';

type PieceDraft = {
  rowId: string;
  codigo: string;
  nombre: string;
  cantidad: string;
  tipo_material: string;
  largo: string;
  ancho: string;
  espesor: string;
  diametro: string;
};

const createEmptyRow = (): PieceDraft => ({
  rowId: crypto.randomUUID(),
  codigo: '',
  nombre: '',
  cantidad: '1',
  tipo_material: '',
  largo: '',
  ancho: '',
  espesor: '',
  diametro: '',
});

interface PieceMatrixProps {
  projectId: number;
  onClose: () => void;
}

const PieceMatrix: React.FC<PieceMatrixProps> = ({ projectId, onClose }) => {
  const addPiecesBulk = useSpecialProjectsStore(state => state.addPiecesBulk);
  const [rows, setRows] = useState<PieceDraft[]>([createEmptyRow()]);
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [requestSnapshot, setRequestSnapshot] = useState('');

  const updateRow = (rowId: string, field: keyof PieceDraft, value: string) => {
    setRows(current => current.map(row => row.rowId === rowId ? { ...row, [field]: value } : row));
  };

  const importRows = () => {
    const imported = pasteText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','));

    const startsWithHeader = /codigo|código|nombre|pieza/i.test(imported[0]?.[0] || '')
      || /codigo|código|nombre|pieza/i.test(imported[0]?.[1] || '');
    const dataRows = startsWithHeader ? imported.slice(1) : imported;
    const added = dataRows.map(columns => ({
      ...createEmptyRow(),
      codigo: columns[0]?.trim() || '',
      nombre: columns[1]?.trim() || '',
      cantidad: columns[2]?.trim() || '1',
      tipo_material: columns[3]?.trim() || '',
      largo: columns[4]?.trim() || '',
      ancho: columns[5]?.trim() || '',
      espesor: columns[6]?.trim() || '',
      diametro: columns[7]?.trim() || '',
    }));

    if (added.length === 0) return;
    setRows(current => [...current.filter(row => row.nombre.trim()), ...added].slice(0, 200));
    setPasteText('');
    setError('');
  };

  const handleSave = async () => {
    const cleanRows = rows.filter(row => row.nombre.trim());
    if (cleanRows.length === 0) {
      setError('Agrega al menos una pieza con nombre.');
      return;
    }
    if (cleanRows.length > 200) {
      setError('La carga admite hasta 200 piezas por envío.');
      return;
    }

    const payload = cleanRows.map(({ rowId, cantidad, ...row }) => ({
      ...row,
      cantidad: Number(cantidad),
    }));
    const snapshot = JSON.stringify(payload);
    const nextRequestId = requestSnapshot === snapshot && requestId ? requestId : crypto.randomUUID();
    setRequestId(nextRequestId);
    setRequestSnapshot(snapshot);
    setSaving(true);
    setError('');

    try {
      await addPiecesBulk(projectId.toString(), nextRequestId, payload);
      onClose();
    } catch (saveError: any) {
      setError(saveError.response?.data?.message || saveError.message || 'No se pudo guardar el despiece.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="piece-matrix-title">
      <section className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h2 id="piece-matrix-title" className="text-lg font-black text-slate-900">Matriz de piezas</h2>
            <p className="text-sm text-slate-500">{rows.filter(row => row.nombre.trim()).length} filas</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar matriz" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Pieza / conjunto</th>
                    <th className="w-24 px-3 py-3">Cant.</th>
                    <th className="px-3 py-3">Material</th>
                    <th className="w-24 px-3 py-3">Largo</th>
                    <th className="w-24 px-3 py-3">Ancho</th>
                    <th className="w-24 px-3 py-3">Espesor</th>
                    <th className="w-24 px-3 py-3">Diámetro</th>
                    <th className="w-12 px-2 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(row => (
                    <tr key={row.rowId}>
                      {(['codigo', 'nombre', 'cantidad', 'tipo_material', 'largo', 'ancho', 'espesor', 'diametro'] as const).map(field => (
                        <td key={field} className="p-2">
                          <input
                            aria-label={`${field} de ${row.nombre || 'pieza nueva'}`}
                            type={field === 'cantidad' || ['largo', 'ancho', 'espesor', 'diametro'].includes(field) ? 'number' : 'text'}
                            min={field === 'cantidad' ? 1 : 0}
                            step={field === 'cantidad' ? 1 : 'any'}
                            value={row[field]}
                            onChange={event => updateRow(row.rowId, field, event.target.value)}
                            className="min-h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                          />
                        </td>
                      ))}
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => setRows(current => current.length > 1 ? current.filter(item => item.rowId !== row.rowId) : [createEmptyRow()])}
                          aria-label={`Quitar ${row.nombre || 'fila'}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setRows(current => current.length < 200 ? [...current, createEmptyRow()] : current)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-teal-700 hover:bg-teal-50">
              <Plus className="h-4 w-4" /> Agregar fila
            </button>
          </div>

          <aside className="space-y-3">
            <label htmlFor="piece-matrix-paste" className="block text-sm font-bold text-slate-800">Pegar desde hoja de cálculo</label>
            <textarea
              id="piece-matrix-paste"
              value={pasteText}
              onChange={event => setPasteText(event.target.value)}
              placeholder={'Código\tPieza\tCantidad\tMaterial\tLargo\tAncho\tEspesor\tDiámetro'}
              rows={8}
              className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
            <button type="button" onClick={importRows} disabled={!pasteText.trim()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <Upload className="h-4 w-4" /> Añadir filas pegadas
            </button>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          </aside>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
            <Check className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar despiece'}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default PieceMatrix;
