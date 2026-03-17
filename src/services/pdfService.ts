import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PDFData {
  type: 'budget' | 'service_order';
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceType: string;
  date: string;
  technician: string;
  description: string;
  items: Array<{
    description: string;
    quantity: number;
    unitValue: number;
  }>;
  totalValue: number;
}

export const generateServicePDF = (data: PDFData) => {
  const doc = new jsPDF();
  const isBudget = data.type === 'budget';
  const title = isBudget ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO';
  
  // Header
  doc.setFillColor(10, 132, 255); // Tech Blue
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('SmartTech IoT', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Soluções em Automação e Segurança', 15, 32);
  
  doc.setFontSize(16);
  doc.text(title, 140, 25);
  doc.setFontSize(10);
  doc.text(`#${data.id.slice(-6).toUpperCase()}`, 140, 32);

  // Client Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 15, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.clientName}`, 15, 62);
  if (data.clientEmail) doc.text(`Email: ${data.clientEmail}`, 15, 67);
  if (data.clientPhone) doc.text(`Telefone: ${data.clientPhone}`, 15, 72);

  // Service Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DO SERVIÇO', 110, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tipo: ${data.serviceType.toUpperCase()}`, 110, 62);
  doc.text(`Data: ${format(new Date(data.date), 'dd/MM/yyyy')}`, 110, 67);
  doc.text(`Técnico: ${data.technician || 'N/A'}`, 110, 72);

  // Description
  if (data.description) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO / OBSERVAÇÕES', 15, 85);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitDescription = doc.splitTextToSize(data.description, 180);
    doc.text(splitDescription, 15, 92);
  }

  // Items Table
  const tableStartY = data.description ? 110 : 85;
  
  autoTable(doc, {
    startY: tableStartY,
    head: [['Descrição', 'Qtd', 'V. Unitário', 'Subtotal']],
    body: data.items.map(item => [
      item.description,
      item.quantity,
      `R$ ${item.unitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${(item.quantity * item.unitValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]),
    foot: [[
      { content: 'TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `R$ ${data.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', textColor: [34, 197, 94] } }
    ]],
    theme: 'striped',
    headStyles: { fillColor: [31, 41, 55] },
    footStyles: { fillColor: [243, 244, 246] }
  });

  // Footer / Signature
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  
  if (finalY < 250) {
    doc.line(15, finalY, 90, finalY);
    doc.text('Assinatura do Técnico', 15, finalY + 5);
    
    doc.line(120, finalY, 195, finalY);
    doc.text('Assinatura do Cliente', 120, finalY + 5);
  }

  // Save PDF
  const fileName = `${title.replace(' ', '_')}_${data.clientName.replace(' ', '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
};
