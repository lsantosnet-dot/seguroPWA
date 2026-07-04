// Dados de exemplo — permite explorar o app com uma carteira realista.
import { addMonthsISO, addYearsISO, parseISO, todayISO } from "@/lib/format";
import { run } from "./database";
import * as repo from "./repo";

function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function seedSampleData() {
  const today = todayISO();

  const clients = [
    {
      name: "Marina Duarte",
      email: "marina.duarte@example.com",
      phone: "(11) 98811-2233",
      cpf: "312.456.789-01",
      city: "São Paulo",
      state: "SP",
      tags: ["VIP", "Auto"],
      notes: "Indicada pelo Ricardo. Prefere contato por WhatsApp.",
    },
    {
      name: "Ricardo Alves",
      email: "ricardo.alves@example.com",
      phone: "(11) 97722-3344",
      cpf: "221.334.556-77",
      city: "Campinas",
      state: "SP",
      tags: ["Auto"],
      notes: null,
    },
    {
      name: "Fernanda Lima",
      email: "fernanda.lima@example.com",
      phone: "(21) 96633-4455",
      cpf: "445.667.889-00",
      city: "Rio de Janeiro",
      state: "RJ",
      tags: ["Novo", "Vida"],
      notes: "Quer cotação de seguro viagem em dezembro.",
    },
    {
      name: "Grupo Vetor Ltda",
      email: "contato@grupovetor.example.com",
      phone: "(31) 3222-1100",
      cpf: null,
      city: "Belo Horizonte",
      state: "MG",
      tags: ["Empresarial"],
      notes: "Frota de 12 veículos + seguro empresarial do galpão.",
    },
  ].map((c) => {
    const r = repo.createClient(c);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  });

  const [marina, ricardo, fernanda, vetor] = clients;

  // Apólices (datas relativas a hoje para popular dashboard/agenda)
  repo.createPolicy({
    clientId: marina,
    type: "auto",
    insurer: "Porto Seguro",
    policyNumber: "AP-2025-0341",
    premium: 4890,
    commissionRate: 15,
    paymentMethod: "cartao",
    installmentsCount: 12,
    startDate: addMonthsISO(today, -11),
    endDate: addDaysISO(today, 18), // renovação chegando — aparece no dashboard
  });
  repo.createPolicy({
    clientId: marina,
    type: "residencial",
    insurer: "Allianz",
    policyNumber: "RE-2025-1102",
    premium: 1250,
    commissionRate: 12,
    paymentMethod: "boleto",
    installmentsCount: 4,
    startDate: addMonthsISO(today, -2),
    endDate: addMonthsISO(today, 10),
  });
  repo.createPolicy({
    clientId: ricardo,
    type: "auto",
    insurer: "Azul Seguros",
    policyNumber: "AU-2024-8876",
    premium: 3480,
    commissionRate: 10,
    paymentMethod: "boleto",
    installmentsCount: 10,
    startDate: addMonthsISO(today, -9),
    endDate: addMonthsISO(today, 3),
  });
  repo.createPolicy({
    clientId: fernanda,
    type: "vida",
    insurer: "SulAmérica",
    policyNumber: "VI-2025-3320",
    premium: 2160,
    commissionRate: 18,
    paymentMethod: "debito",
    installmentsCount: 12,
    startDate: today,
    endDate: addYearsISO(today, 1),
  });
  repo.createPolicy({
    clientId: vetor,
    type: "empresarial",
    insurer: "Tokio Marine",
    policyNumber: "EM-2025-0077",
    premium: 18400,
    commissionRate: 8,
    paymentMethod: "boleto",
    installmentsCount: 12,
    startDate: addMonthsISO(today, -1),
    endDate: addMonthsISO(today, 11),
  });

  // Cotação em aberto para a Fernanda (seguro viagem)
  const q = repo.createQuote({ clientId: fernanda, type: "viagem" });
  if (q.ok) {
    void repo.addQuoteOption(q.id, {
      insurer: "Porto Seguro",
      premium: 480,
      coverage: "Europa 15 dias, bagagem + despesas médicas EUR 60k",
      installmentsCount: 3,
      paymentMethod: "cartao",
    });
    void repo.addQuoteOption(q.id, {
      insurer: "Zurich",
      premium: 415,
      coverage: "Europa 15 dias, despesas médicas EUR 40k",
      installmentsCount: 2,
      paymentMethod: "cartao",
    });
  }

  // Sinistro em análise
  repo.addClaim({
    clientId: ricardo,
    date: addMonthsISO(today, -1),
    description: "Colisão traseira no estacionamento — orçamento da funilaria anexado.",
    amount: 5200,
    status: "em_analise",
  });

  // Relacionamento
  repo.addComment(marina, "whatsapp", "Confirmou renovação do auto. Enviar cotação atualizada até sexta.");
  repo.addComment(fernanda, "ligacao", "Primeira reunião — perfil conservador, quer ampliar cobertura de vida.");

  // Parcelas já vencidas ficam pagas — sobram só as 2 últimas em aberto,
  // simulando uma carteira em dia com cobranças recentes.
  run(
    `UPDATE installments SET status = 'paga', paid_at = due_date
      WHERE due_date < ? AND id NOT IN (
        SELECT id FROM installments WHERE due_date < ? ORDER BY due_date DESC LIMIT 2
      )`,
    [today, today],
  );

  // Meta do mês
  repo.setGoal(today.slice(0, 7), 15000);
}
