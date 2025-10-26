let custosFixosMensais = 0;  // soma mensal de (aluguel ou parcela) + (seguro mensalizado) + (IPVA/12)
let ganhos = [];              // { data, aplicativo, bruto, alimentacaoDia }
let chartSemanal = null;

// === UI: alternar campos ===
function mostrarCamposCarro() {
  const tipo = document.getElementById("tipoCarro").value;
  document.getElementById("camposProprio").style.display = (tipo === "proprio") ? "block" : "none";
  document.getElementById("camposAlugado").style.display = (tipo === "alugado") ? "block" : "none";
}

function mostrarParcelasSeguro() {
  const val = document.getElementById("seguroParcelado").value;
  document.getElementById("campoParcelasSeguro").style.display = (val === "sim") ? "block" : "none";
}

// === CUSTOS ===
function salvarCustos() {
  const tipo = document.getElementById("tipoCarro").value;
  if (!tipo) { alert("Selecione o tipo de carro (Próprio ou Alugado)."); return; }

  let ipvaAnual = 0;
  let seguroMensal = 0;
  let custoCarroMensal = 0;

  if (tipo === "proprio") {
    const valorVeiculo   = parseFloat(document.getElementById("valorVeiculo").value)   || 0;
    const valorParcela   = parseFloat(document.getElementById("valorParcela").value)   || 0;
    const valorSeguro    = parseFloat(document.getElementById("valorSeguro").value)    || 0;
    const seguroParcelado= document.getElementById("seguroParcelado").value;
    const parcelas       = parseInt(document.getElementById("parcelasSeguro").value)   || 12;

    ipvaAnual   = valorVeiculo * 0.04; // 4% do valor do carro
    // seguro mensalizado: se "sim", dividir pelas parcelas; senão, dividir por 12
    seguroMensal = (seguroParcelado === "sim") ? (valorSeguro / parcelas) : (valorSeguro / 12);
    custoCarroMensal = valorParcela;

  } else {
    // alugado
    const valorAluguel = parseFloat(document.getElementById("valorAluguel").value) || 0;
    custoCarroMensal = valorAluguel;
  }

  custosFixosMensais = custoCarroMensal + seguroMensal + (ipvaAnual / 12);
  alert("Custos salvos com sucesso!");
  document.getElementById("etapaCustos").style.display = "none";
  document.getElementById("etapaGanhos").style.display = "block";
}

// === GANHOS ===
function adicionarGanho() {
  if (custosFixosMensais <= 0) { alert("Preencha e salve a planilha de custos primeiro."); return; }

  const data = document.getElementById("data").value;
  const aplicativo = document.getElementById("aplicativo").value;
  const bruto = parseFloat(document.getElementById("ganhosBrutos").value) || 0;
  const alimentacaoDia = parseFloat(document.getElementById("alimentacaoDia").value) || 0;

  if (!data || !aplicativo || bruto <= 0) {
    alert("Informe data, aplicativo e ganhos brutos válidos.");
    return;
  }

  ganhos.push({ data, aplicativo, bruto, alimentacaoDia });
  // limpa campos de ganhos (mantém data/aplicativo por conveniência)
  document.getElementById("ganhosBrutos").value = "";
  document.getElementById("alimentacaoDia").value = "";

  atualizarTabelaGanhos();
}

// === TABELA / RESUMOS ===
function atualizarTabelaGanhos() {
  const corpo = document.getElementById("tabelaGanhos");
  corpo.innerHTML = "";

  // agrega por dia
  const porDia = {};
  ganhos.forEach(g => {
    if (!porDia[g.data]) porDia[g.data] = [];
    porDia[g.data].push(g);
  });

  Object.keys(porDia).sort().forEach(dataISO => {
    const lista = porDia[dataISO];
    const dt = new Date(dataISO);
    const diasMes = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();
    const custoFixoDia = custosFixosMensais / diasMes;

    let brutoTotal = 0;
    let combustivelTotal = 0;
    let alimentacaoTotal = 0;
    let liquidoSemFixo = 0;
    const apps = new Set();

    lista.forEach(g => {
      brutoTotal += g.bruto;
      const combustivel = g.bruto * 0.20; // 20% dos ganhos brutos
      combustivelTotal += combustivel;
      alimentacaoTotal += g.alimentacaoDia;
      liquidoSemFixo += g.bruto - combustivel - g.alimentacaoDia;
      apps.add(g.aplicativo);
    });

    const saldoFinal = liquidoSemFixo - custoFixoDia;

    corpo.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${dt.toLocaleDateString("pt-BR")}</td>
        <td>${[...apps].join(", ")}</td>
        <td>R$ ${brutoTotal.toFixed(2)}</td>
        <td>R$ ${combustivelTotal.toFixed(2)}</td>
        <td>R$ ${alimentacaoTotal.toFixed(2)}</td>
        <td>R$ ${liquidoSemFixo.toFixed(2)}</td>
        <td>R$ ${custoFixoDia.toFixed(2)}</td>
        <td>R$ ${saldoFinal.toFixed(2)}</td>
        <td>
          <button class="btn btn-danger" onclick="apagarGanhoDia('${dataISO}')">Apagar Dia</button>
        </td>
      </tr>
    `);
  });

  atualizarResumoMensal();
  atualizarGrafico();
}

function atualizarResumoMensal() {
  const alvo = document.getElementById("resumoMensal");

  const porDia = {};
  ganhos.forEach(g => {
    if (!porDia[g.data]) porDia[g.data] = [];
    porDia[g.data].push(g);
  });

  let totalBruto = 0;
  let totalLiquidoSemFixo = 0;
  let saldoFinalAcumulado = 0;

  Object.keys(porDia).forEach(dataISO => {
    const lista = porDia[dataISO];
    const dt = new Date(dataISO);
    const diasMes = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();
    const custoFixoDia = custosFixosMensais / diasMes;

    let brutoDia = 0;
    let liquidoDia = 0;

    lista.forEach(g => {
      brutoDia += g.bruto;
      liquidoDia += g.bruto - (g.bruto * 0.20) - g.alimentacaoDia;
    });

    totalBruto += brutoDia;
    totalLiquidoSemFixo += liquidoDia;
    saldoFinalAcumulado += (liquidoDia - custoFixoDia);
  });

  alvo.innerHTML = `
    <h2>Resumo do Mês</h2>
    <p><b>Total Bruto:</b> R$ ${totalBruto.toFixed(2)}</p>
    <p><b>Liquído (sem fixos):</b> R$ ${totalLiquidoSemFixo.toFixed(2)}</p>
    <p><b>Saldo Final Acumulado:</b> R$ ${saldoFinalAcumulado.toFixed(2)}</p>
  `;
}

// === GRÁFICO (barras: saldo líquido; linha: custos totais do dia) ===
function atualizarGrafico() {
  const porDia = {};
  ganhos.forEach(g => {
    if (!porDia[g.data]) porDia[g.data] = [];
    porDia[g.data].push(g);
  });

  const datasOrdenadas = Object.keys(porDia).sort();
  const labels = datasOrdenadas.map(d => new Date(d).toLocaleDateString("pt-BR"));

  const dataSaldo = [];
  const dataCustos = [];

  datasOrdenadas.forEach(dataISO => {
    const lista = porDia[dataISO];
    const dt = new Date(dataISO);
    const diasMes = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();
    const custoFixoDia = custosFixosMensais / diasMes;

    let combustivel = 0;
    let alimentacao = 0;
    let liquidoSemFixo = 0;

    lista.forEach(g => {
      const c = g.bruto * 0.20;
      combustivel += c;
      alimentacao += g.alimentacaoDia;
      liquidoSemFixo += g.bruto - c - g.alimentacaoDia;
    });

    const saldo = liquidoSemFixo - custoFixoDia;
    const custosTotais = combustivel + alimentacao + custoFixoDia;

    dataSaldo.push(Number(saldo.toFixed(2)));
    dataCustos.push(Number(custosTotais.toFixed(2)));
  });

  const ctx = document.getElementById("graficoSemanal").getContext("2d");
  if (chartSemanal) chartSemanal.destroy();

  chartSemanal = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Saldo Diário (líquido)",
          data: dataSaldo,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
          yAxisID: "y"
        },
        {
          label: "Custos Totais do Dia",
          data: dataCustos,
          type: "line",
          borderColor: "rgba(231, 76, 60, 1)",
          backgroundColor: "rgba(231, 76, 60, 0.2)",
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "rgba(231, 76, 60, 1)",
          yAxisID: "y"
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      stacked: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "R$" }
        }
      }
    }
  });
}

// === AÇÕES DELETAR ===
function apagarGanhoDia(dataISO) {
  if (!confirm("Apagar todos os lançamentos deste dia?")) return;
  ganhos = ganhos.filter(g => g.data !== dataISO);
  atualizarTabelaGanhos();
}

function apagarTodosGanhos() {
  if (ganhos.length === 0) { alert("Não há ganhos para apagar."); return; }
  if (!confirm("Tem certeza que deseja apagar TODOS os ganhos?")) return;
  ganhos = [];
  atualizarTabelaGanhos();
}
