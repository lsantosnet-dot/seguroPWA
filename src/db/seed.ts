// Dados de exemplo — permite explorar o app com uma carteira realista.
import { addMonthsISO, parseISO, todayISO } from "@/lib/format";
import { run } from "./database";
import * as repo from "./repo";

function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function markOverdueInstallments(policyId: string) {
  run(
    `UPDATE installments SET status = 'atrasada'
      WHERE policy_id = ? AND status = 'pendente' AND due_date < ?`,
    [policyId, todayISO()],
  );
}

export function seedSampleData() {
  const today = todayISO();

  const clients = [
    {
      name: "Juliana Ferreira Costa",
      email: "juliana.costa@example.com",
      phone: "(11) 98765-4321",
      cpf: "123.456.789-00",
      city: "São Paulo",
      state: "SP",
      tags: ["Auto", "Novo"],
      notes: "Comparando cotações de seguro auto para o Onix 2022.",
    },
    {
      name: "Eduardo Nascimento Silva",
      email: "eduardo.nascimento@example.com",
      phone: "(21) 99887-6655",
      cpf: "234.567.890-11",
      city: "Rio de Janeiro",
      state: "RJ",
      tags: ["Residencial"],
      notes: "Apartamento novo, quer cobertura contra roubo e incêndio.",
    },
    {
      name: "Camila Rodrigues Barbosa",
      email: "camila.barbosa@example.com",
      phone: "(31) 98123-4567",
      cpf: "345.678.901-22",
      city: "Belo Horizonte",
      state: "MG",
      tags: ["Saúde"],
      notes: "Busca plano de saúde individual, já é cliente de auto em outra corretora.",
    },
    {
      name: "Rafael Augusto Pereira",
      email: "rafael.pereira@example.com",
      phone: "(11) 97654-3210",
      cpf: "456.789.012-33",
      city: "São Paulo",
      state: "SP",
      tags: ["Auto", "VIP"],
      notes: "Cliente antigo, sempre renova em dia.",
    },
    {
      name: "Beatriz Almeida Souza",
      email: "beatriz.almeida@example.com",
      phone: "(21) 96543-2109",
      cpf: "567.890.123-44",
      city: "Niterói",
      state: "RJ",
      tags: ["Vida"],
      notes: "Segurada de vida, renovação urgente.",
    },
    {
      name: "Thiago Henrique Martins",
      email: "thiago.martins@example.com",
      phone: "(31) 3344-5566",
      cpf: "678.901.234-55",
      city: "Belo Horizonte",
      state: "MG",
      tags: ["Empresarial"],
      notes: "Dono de loja, apólice empresarial vencida — contatar com urgência.",
    },
    {
      name: "Larissa Gonçalves Ribeiro",
      email: "larissa.ribeiro@example.com",
      phone: "(19) 95432-1098",
      cpf: "789.012.345-66",
      city: "Campinas",
      state: "SP",
      tags: ["Residencial"],
      notes: null,
    },
    {
      name: "Bruno Cardoso Teixeira",
      email: "bruno.teixeira@example.com",
      phone: "(41) 94321-0987",
      cpf: "890.123.456-77",
      city: "Curitiba",
      state: "PR",
      tags: ["Auto"],
      notes: "Cancelou a apólice após vender o carro.",
    },
    {
      name: "Patrícia Mendes Carvalho",
      email: "patricia.carvalho@example.com",
      phone: "(11) 93210-9876",
      cpf: "901.234.567-88",
      city: "São Paulo",
      state: "SP",
      tags: ["Viagem", "Novo"],
      notes: "Viagem para a Europa em outubro, precisa de seguro viagem.",
    },
    {
      name: "Gustavo Lima Andrade",
      email: "gustavo.andrade@example.com",
      phone: "(48) 92109-8765",
      cpf: "012.345.678-99",
      city: "Florianópolis",
      state: "SC",
      tags: ["Empresarial", "VIP"],
      notes: "Rede de 3 lojas, apólice empresarial renovando em breve.",
    },
  ].map((c) => {
    const r = repo.createClient(c);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  });

  const [
    juliana,
    eduardo,
    camila,
    rafael,
    beatriz,
    thiago,
    larissa,
    bruno,
    patricia,
    gustavo,
  ] = clients;

  // ---------------------------------------------------------------------
  // Apenas cotações/propostas em aberto (sem apólice ainda)
  // ---------------------------------------------------------------------

  const qJuliana = repo.createQuote({ clientId: juliana, type: "auto" });
  if (qJuliana.ok) {
    void repo.addQuoteOption(qJuliana.id, {
      insurer: "Porto Seguro",
      premium: 3200,
      coverage: "Compreensiva, terceiros até R$ 50 mil",
      installmentsCount: 12,
      paymentMethod: "cartao",
    });
    void repo
      .addQuoteOption(qJuliana.id, {
        insurer: "Azul Seguros",
        premium: 2950,
        coverage: "Compreensiva, terceiros até R$ 40 mil",
        installmentsCount: 10,
        paymentMethod: "boleto",
      })
      .then((r) => {
        if (r.ok) repo.markBestOption(qJuliana.id, r.option.id);
      });
    void repo.addQuoteOption(qJuliana.id, {
      insurer: "HDI Seguros",
      premium: 3100,
      coverage: "Compreensiva, carro reserva 15 dias",
      installmentsCount: 12,
      paymentMethod: "cartao",
    });
  }

  const qEduardo = repo.createQuote({ clientId: eduardo, type: "residencial" });
  if (qEduardo.ok) {
    void repo.addQuoteOption(qEduardo.id, {
      insurer: "Allianz",
      premium: 980,
      coverage: "Incêndio, roubo e danos elétricos",
      installmentsCount: 4,
      paymentMethod: "boleto",
    });
    void repo.addQuoteOption(qEduardo.id, {
      insurer: "Tokio Marine",
      premium: 1050,
      coverage: "Incêndio, roubo e responsabilidade civil",
      installmentsCount: 6,
      paymentMethod: "cartao",
    });
  }

  const qCamila = repo.createQuote({ clientId: camila, type: "saude" });
  if (qCamila.ok) {
    void repo
      .addQuoteOption(qCamila.id, {
        insurer: "SulAmérica Saúde",
        premium: 650,
        coverage: "Plano individual, coparticipação parcial",
        installmentsCount: 1,
        paymentMethod: "debito",
      })
      .then((r) => {
        if (r.ok) repo.markBestOption(qCamila.id, r.option.id);
      });
    void repo.addQuoteOption(qCamila.id, {
      insurer: "Bradesco Saúde",
      premium: 720,
      coverage: "Plano individual, sem coparticipação",
      installmentsCount: 1,
      paymentMethod: "debito",
    });
  }

  const qPatricia = repo.createQuote({ clientId: patricia, type: "viagem" });
  if (qPatricia.ok) {
    void repo.addQuoteOption(qPatricia.id, {
      insurer: "Porto Seguro Viagem",
      premium: 390,
      coverage: "Europa 10 dias, bagagem + despesas médicas EUR 30k",
      installmentsCount: 2,
      paymentMethod: "cartao",
    });
    void repo
      .addQuoteOption(qPatricia.id, {
        insurer: "Assist Card",
        premium: 350,
        coverage: "Europa 10 dias, despesas médicas EUR 60k",
        installmentsCount: 1,
        paymentMethod: "avista",
      })
      .then((r) => {
        if (r.ok) repo.markBestOption(qPatricia.id, r.option.id);
      });
  }

  // ---------------------------------------------------------------------
  // Cotações com proposta escolhida → oficializadas em apólice,
  // com vencimentos variados (bem próximo, distante, vencida, cancelada)
  // ---------------------------------------------------------------------

  // Rafael — auto vencendo em 12 dias (renovação urgente)
  const qRafael = repo.createQuote({ clientId: rafael, type: "auto" });
  if (qRafael.ok) {
    void repo.addQuoteOption(qRafael.id, {
      insurer: "Porto Seguro",
      premium: 4200,
      coverage: "Compreensiva top, carro reserva 30 dias",
      installmentsCount: 12,
      paymentMethod: "cartao",
    });
    void repo
      .addQuoteOption(qRafael.id, {
        insurer: "Azul Seguros",
        premium: 3900,
        coverage: "Compreensiva, terceiros até R$ 60 mil",
        installmentsCount: 12,
        paymentMethod: "boleto",
      })
      .then((r) => {
        if (!r.ok) return;
        repo.officializeQuote({
          quoteId: qRafael.id,
          optionId: r.option.id,
          policyNumber: "AU-2025-4471",
          paymentMethod: "boleto",
          installmentsCount: 12,
          startDate: addMonthsISO(today, -11),
          endDate: addDaysISO(today, 12),
          commissionRate: 12,
        });
      });
  }

  // Beatriz — vida vencendo em 5 dias (muito urgente)
  const qBeatriz = repo.createQuote({ clientId: beatriz, type: "vida" });
  if (qBeatriz.ok) {
    void repo.addQuoteOption(qBeatriz.id, {
      insurer: "SulAmérica Vida",
      premium: 180,
      coverage: "Morte natural e acidental, capital R$ 100 mil",
      installmentsCount: 12,
      paymentMethod: "debito",
    });
    void repo
      .addQuoteOption(qBeatriz.id, {
        insurer: "Prudential",
        premium: 210,
        coverage: "Morte e invalidez, capital R$ 150 mil",
        installmentsCount: 12,
        paymentMethod: "cartao",
      })
      .then((r) => {
        if (!r.ok) return;
        repo.officializeQuote({
          quoteId: qBeatriz.id,
          optionId: r.option.id,
          policyNumber: "VI-2025-2210",
          paymentMethod: "cartao",
          installmentsCount: 12,
          startDate: addMonthsISO(today, -11),
          endDate: addDaysISO(today, 5),
          commissionRate: 18,
        });
      });
  }

  // Thiago — empresarial já vencida há 20 dias
  const qThiago = repo.createQuote({ clientId: thiago, type: "empresarial" });
  if (qThiago.ok) {
    void repo.addQuoteOption(qThiago.id, {
      insurer: "Tokio Marine",
      premium: 15800,
      coverage: "Loja completa, incêndio e roubo",
      installmentsCount: 12,
      paymentMethod: "boleto",
    });
    void repo
      .addQuoteOption(qThiago.id, {
        insurer: "Zurich",
        premium: 14900,
        coverage: "Loja completa, danos elétricos inclusos",
        installmentsCount: 12,
        paymentMethod: "boleto",
      })
      .then((r) => {
        if (!r.ok) return;
        const result = repo.officializeQuote({
          quoteId: qThiago.id,
          optionId: r.option.id,
          policyNumber: "EM-2024-0099",
          paymentMethod: "boleto",
          installmentsCount: 12,
          startDate: addMonthsISO(today, -13),
          endDate: addDaysISO(today, -20),
          commissionRate: 8,
        });
        if (result.ok) {
          repo.updatePolicy(result.policyId, {
            type: "empresarial",
            insurer: "Zurich",
            policyNumber: "EM-2024-0099",
            premium: 14900,
            commissionRate: 8,
            paymentMethod: "boleto",
            installmentsCount: 12,
            startDate: addMonthsISO(today, -13),
            endDate: addDaysISO(today, -20),
            status: "vencida",
          });
          markOverdueInstallments(result.policyId);
        }
      });
  }

  // Larissa — residencial com vencimento distante (8 meses)
  const qLarissa = repo.createQuote({ clientId: larissa, type: "residencial" });
  if (qLarissa.ok) {
    void repo
      .addQuoteOption(qLarissa.id, {
        insurer: "Porto Seguro",
        premium: 1400,
        coverage: "Incêndio, roubo e vendaval",
        installmentsCount: 4,
        paymentMethod: "boleto",
      })
      .then((r) => {
        if (!r.ok) return;
        repo.officializeQuote({
          quoteId: qLarissa.id,
          optionId: r.option.id,
          policyNumber: "RE-2025-3345",
          paymentMethod: "boleto",
          installmentsCount: 4,
          startDate: addMonthsISO(today, -4),
          endDate: addMonthsISO(today, 8),
          commissionRate: 12,
        });
      });
    void repo.addQuoteOption(qLarissa.id, {
      insurer: "Allianz",
      premium: 1550,
      coverage: "Incêndio, roubo e responsabilidade civil",
      installmentsCount: 6,
      paymentMethod: "cartao",
    });
  }

  // Bruno — auto cancelada após a venda do carro
  const qBruno = repo.createQuote({ clientId: bruno, type: "auto" });
  if (qBruno.ok) {
    void repo
      .addQuoteOption(qBruno.id, {
        insurer: "Azul Seguros",
        premium: 2800,
        coverage: "Compreensiva, terceiros até R$ 40 mil",
        installmentsCount: 10,
        paymentMethod: "boleto",
      })
      .then((r) => {
        if (!r.ok) return;
        const result = repo.officializeQuote({
          quoteId: qBruno.id,
          optionId: r.option.id,
          policyNumber: "AU-2024-7789",
          paymentMethod: "boleto",
          installmentsCount: 10,
          startDate: addMonthsISO(today, -14),
          endDate: addMonthsISO(today, -2),
          commissionRate: 10,
        });
        if (result.ok) {
          repo.updatePolicy(result.policyId, {
            type: "auto",
            insurer: "Azul Seguros",
            policyNumber: "AU-2024-7789",
            premium: 2800,
            commissionRate: 10,
            paymentMethod: "boleto",
            installmentsCount: 10,
            startDate: addMonthsISO(today, -14),
            endDate: addMonthsISO(today, -2),
            status: "cancelada",
          });
        }
      });
    void repo.addQuoteOption(qBruno.id, {
      insurer: "HDI Seguros",
      premium: 3050,
      coverage: "Compreensiva, carro reserva 15 dias",
      installmentsCount: 12,
      paymentMethod: "cartao",
    });
  }

  // Gustavo — empresarial vencendo em 25 dias (dentro da janela de renovação)
  const qGustavo = repo.createQuote({ clientId: gustavo, type: "empresarial" });
  if (qGustavo.ok) {
    void repo
      .addQuoteOption(qGustavo.id, {
        insurer: "Tokio Marine",
        premium: 22000,
        coverage: "3 lojas, incêndio, roubo e responsabilidade civil",
        installmentsCount: 12,
        paymentMethod: "boleto",
      })
      .then((r) => {
        if (!r.ok) return;
        repo.officializeQuote({
          quoteId: qGustavo.id,
          optionId: r.option.id,
          policyNumber: "EM-2025-1180",
          paymentMethod: "boleto",
          installmentsCount: 12,
          startDate: addMonthsISO(today, -11),
          endDate: addDaysISO(today, 25),
          commissionRate: 8,
        });
      });
    void repo.addQuoteOption(qGustavo.id, {
      insurer: "Liberty Seguros",
      premium: 23500,
      coverage: "3 lojas, incêndio, roubo e quebra de vidros",
      installmentsCount: 12,
      paymentMethod: "boleto",
    });
  }

  // Meta do mês
  repo.setGoal(today.slice(0, 7), 15000);
}
