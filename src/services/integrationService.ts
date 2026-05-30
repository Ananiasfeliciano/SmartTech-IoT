import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { OsRecord } from '../data/osData';

function shortId() {
  return Date.now().toString().slice(-6);
}

/**
 * Quando orçamento é aprovado → cria OS + conta a receber no financeiro
 */
export async function onQuoteApproved(quote: OsRecord): Promise<void> {
  const osData = {
    codigo: `OS-${shortId()}`,
    titulo: `OS: ${quote.titulo}`,
    cliente: quote.cliente,
    categoria: 'Instalação',
    status: 'Aberta',
    prioridade: quote.prioridade ?? 'Normal',
    responsavel: quote.responsavel,
    data: new Date().toISOString().slice(0, 10),
    valor: quote.valor,
    descricao: `Gerado automaticamente do orçamento ${quote.codigo ?? ''}.\n\n${quote.descricao ?? ''}`,
    contato: quote.contato ?? '',
    local: quote.local ?? '',
    createdAt: serverTimestamp(),
    sourceOrcamentoId: quote.id,
  };

  const financialData = {
    codigo: `REC-${shortId()}`,
    titulo: `A Receber: ${quote.titulo}`,
    cliente: quote.cliente,
    categoria: 'Conta a Receber',
    status: 'Aberto',
    prioridade: 'Alta',
    responsavel: quote.responsavel,
    data: new Date().toISOString().slice(0, 10),
    valor: quote.valor,
    descricao: `Conta a receber gerada do orçamento aprovado ${quote.codigo ?? ''}.`,
    contato: quote.contato ?? '',
    local: quote.local ?? '',
    createdAt: serverTimestamp(),
    sourceOrcamentoId: quote.id,
  };

  await Promise.all([
    addDoc(collection(db, 'ordens'), osData),
    addDoc(collection(db, 'financeiro'), financialData),
  ]);
}

/**
 * Quando OS é concluída → registra saída no estoque
 */
export async function onOSCompleted(os: OsRecord): Promise<void> {
  await addDoc(collection(db, 'estoque'), {
    codigo: `SAI-${shortId()}`,
    titulo: `Saída OS: ${os.titulo}`,
    cliente: os.cliente,
    categoria: 'Saída',
    status: 'Concluída',
    prioridade: os.prioridade ?? 'Normal',
    responsavel: os.responsavel,
    data: new Date().toISOString().slice(0, 10),
    valor: os.valor,
    descricao: `Baixa de estoque referente à OS ${os.codigo ?? ''} concluída.`,
    contato: os.contato ?? '',
    local: os.local ?? '',
    createdAt: serverTimestamp(),
    sourceOSId: os.id,
  });
}

/**
 * Quando contrato é criado → cria cobrança mensal no financeiro
 */
export async function onContractCreated(contract: OsRecord): Promise<void> {
  await addDoc(collection(db, 'financeiro'), {
    codigo: `COB-${shortId()}`,
    titulo: `Mensalidade: ${contract.titulo}`,
    cliente: contract.cliente,
    categoria: 'Mensalidade',
    status: 'Aberto',
    prioridade: 'Alta',
    responsavel: contract.responsavel,
    data: new Date().toISOString().slice(0, 10),
    valor: contract.valor,
    descricao: `Cobrança mensal gerada do contrato ${contract.codigo ?? ''}.`,
    contato: contract.contato ?? '',
    local: contract.local ?? '',
    createdAt: serverTimestamp(),
    sourceContratoId: contract.id,
  });
}

/**
 * Ponto central de integração — chamado após status change em saveRecord.
 */
export async function triggerIntegration(
  moduleId: string,
  oldRecord: OsRecord,
  newData: Partial<OsRecord>
): Promise<void> {
  const newStatus = newData.status;
  const oldStatus = oldRecord.status;
  if (newStatus === oldStatus) return;

  const updated: OsRecord = { ...oldRecord, ...newData };

  if (moduleId === 'orcamentos' && newStatus === 'Aprovado') {
    await onQuoteApproved(updated);
  }
  if (moduleId === 'ordens' && (newStatus === 'Concluída' || newStatus === 'Concluida')) {
    await onOSCompleted(updated);
  }
  if (moduleId === 'contratos' && newStatus === 'Ativo') {
    await onContractCreated(updated);
  }
}
