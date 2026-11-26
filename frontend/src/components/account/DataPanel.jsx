import { memo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { ErrorNote, PanelSection, SuccessNote } from './settingsUi';
import { exportUserData } from '../../services/userSettings';
import { buildExport, exportFileName } from '../../utils/dataExport';

function download(name, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  // O navegador já começou o download; a URL pode ser liberada no próximo ciclo.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** "Exportar meus dados": um JSON com perfil, configurações, times, builds, favoritos e histórico. */
function DataPanel({ userId, email }) {
  const [state, setState] = useState({ busy: false, error: null, success: null });

  const exportData = async () => {
    setState({ busy: true, error: null, success: null });
    try {
      const data = await exportUserData(userId);
      download(exportFileName(), JSON.stringify(buildExport({ email, userId, data }), null, 2));
      setState({ busy: false, error: null, success: 'Arquivo gerado. Confira a pasta de downloads.' });
    } catch (error) {
      console.warn('Exportação falhou:', error);
      setState({ busy: false, error: 'Não foi possível exportar agora. Tente de novo.', success: null });
    }
  };

  return (
    <div>
      <PanelSection
        title="Exportar meus dados"
        description="Um arquivo JSON com tudo o que a sua conta guarda aqui: perfil, preferências, times, builds, favoritos e histórico."
      >
        <ErrorNote>{state.error}</ErrorNote>
        <SuccessNote>{state.success}</SuccessNote>
        <button type="button" onClick={exportData} disabled={state.busy} className="btn-action">
          {state.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          Baixar meus dados
        </button>
        <p className="mt-3 text-xs italic text-umber">
          O arquivo é gerado no seu navegador, com a sua sessão; nada passa por outro servidor.
        </p>
      </PanelSection>
    </div>
  );
}

export default memo(DataPanel);
