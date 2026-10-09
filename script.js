        const CHAVE_STORAGE = "dissolucoes_capsulas";
        let lotes = [];
        let loteAtivoId = null;

        // Inicialização
        async function iniciarSistema() {
            await carregarLotesDoStorage();
            popularSelectsAneis();
            renderizarTabelaDissolucao();
            atualizarSelectLotes();
            
            if (lotes.length > 0) {
                loteAtivoId = lotes[0].id;
                carregarLoteAtivoNosCampos();
            }
        }

        /* TEMA */
        function alterarTema(tema) {
            document.body.className = `theme-${tema}`;
        }

        /* NAVEGAÇÃO DE TELAS */
        function trocarTela(idPainel) {
            document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

            document.getElementById(idPainel).classList.add('active');
            
            const indexMap = {
                'lotes-panel': 0,
                'aneis-panel': 1,
                'dissolucao-panel': 2,
                'analise-panel': 3
            };
            document.querySelectorAll('.tab-button')[indexMap[idPainel]].classList.add('active');

            if (idPainel === 'aneis-panel') {
                carregarDadosAnelPesagem();
                renderizarResumoAneisPesagem();
            } else if (idPainel === 'dissolucao-panel') {
                carregarDadosAnelDissolucao();
                renderizarResumoAneisDissolucao();
            }
        }

        /* PERSISTÊNCIA */
        async function carregarLotesDoStorage() {
            try {
                const valorBruto = localStorage.getItem(CHAVE_STORAGE);
                lotes = valorBruto ? JSON.parse(valorBruto) : [];
                if (!Array.isArray(lotes)) lotes = [];
            } catch (erro) {
                lotes = [];
            }
        }

        async function salvarLotesNoStorage() {
            try {
                localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lotes));
                return true;
            } catch (erro) {
                return false;
            }
        }

        /* GERENCIAMENTO E SINCRONIZAÇÃO DE LOTES */
        function atualizarSelectLotes() {
            const selects = document.querySelectorAll(".select-lote-global");
            
            selects.forEach(select => {
                select.innerHTML = "";

                if (lotes.length === 0) {
                    select.innerHTML = '<option value="">Nenhum lote cadastrado</option>';
                    return;
                }

                lotes.forEach(l => {
                    const opt = document.createElement("option");
                    opt.value = l.id;
                    opt.textContent = `${l.lote} (Filme: ${formatarData(l.dataFilme)})`;
                    select.appendChild(opt);
                });

                if (loteAtivoId) {
                    select.value = loteAtivoId;
                } else if (lotes.length > 0) {
                    loteAtivoId = lotes[0].id;
                    select.value = loteAtivoId;
                }
            });
        }

        function selecionarLoteAtivo(id) {
            loteAtivoId = id;
            
            // Sincroniza todos os selects de lote para a mesma opção
            const selects = document.querySelectorAll(".select-lote-global");
            selects.forEach(select => select.value = id);

            carregarLoteAtivoNosCampos();

            // Atualiza visualizações dependentes da aba atual
            renderizarResumoAneisPesagem();
            carregarDadosAnelPesagem();
            renderizarResumoAneisDissolucao();
            carregarDadosAnelDissolucao();
        }

        function carregarLoteAtivoNosCampos() {
            const lote = lotes.find(l => l.id === loteAtivoId);
            if (!lote) return;

            document.getElementById("lote-nome").value = lote.lote || "";
            document.getElementById("lote-dataFilme").value = lote.dataFilme || "";
            document.getElementById("lote-bloom").value = lote.bloom || "";
            document.getElementById("lote-viscosidade").value = lote.viscosidade || "";
            document.getElementById("lote-umidade").value = lote.umidade || "";
        }

        async function salvarNovoLote() {
            const nome = document.getElementById("lote-nome").value.trim();
            if (!nome) {
                alert("Informe a identificação do Lote.");
                return;
            }

            const novoLote = {
                id: gerarId(),
                lote: nome,
                dataFilme: document.getElementById("lote-dataFilme").value,
                bloom: document.getElementById("lote-bloom").value,
                viscosidade: document.getElementById("lote-viscosidade").value,
                umidade: document.getElementById("lote-umidade").value,
                aneis: {}
            };

            lotes.push(novoLote);
            loteAtivoId = novoLote.id;
            await salvarLotesNoStorage();

            atualizarSelectLotes();
            alert("Lote cadastrado e definido como ativo!");
        }

        async function excluirLoteAtual() {
            if (!loteAtivoId) return;
            if (!confirm("Tem certeza que deseja excluir o lote selecionado?")) return;

            lotes = lotes.filter(l => l.id !== loteAtivoId);
            loteAtivoId = lotes.length > 0 ? lotes[0].id : null;
            await salvarLotesNoStorage();

            atualizarSelectLotes();
            carregarLoteAtivoNosCampos();
            renderizarResumoAneisPesagem();
            renderizarResumoAneisDissolucao();
        }

        /* CONFIGURAÇÃO DOS SELECTS DE ANÉIS */
        function popularSelectsAneis() {
            const selectPesagem = document.getElementById("anel-select-pesagem");
            const selectDissolucao = document.getElementById("anel-select-dissolucao");

            selectPesagem.innerHTML = "";
            selectDissolucao.innerHTML = "";

            for (let i = 1; i <= 60; i++) {
                const opt1 = document.createElement("option");
                opt1.value = i;
                opt1.textContent = "Anel " + i;
                selectPesagem.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = i;
                opt2.textContent = "Anel " + i;
                selectDissolucao.appendChild(opt2);
            }
        }

        /* TELA 2 - PESAGEM & ESPESSURA */
        function carregarDadosAnelPesagem() {
            const numAnel = document.getElementById("anel-select-pesagem").value;
            const lote = lotes.find(l => l.id === loteAtivoId);

            if (!lote || !lote.aneis || !lote.aneis[numAnel]) {
                document.getElementById("anel-espessura").value = "";
                document.getElementById("anel-pesoFinal").value = "";
                document.getElementById("anel-teorica").value = "";
                return;
            }

            const dados = lote.aneis[numAnel];
            document.getElementById("anel-espessura").value = dados.espessura || "";
            document.getElementById("anel-pesoFinal").value = dados.pesoFinal || "";
            calcularTeoricaEmTempoReal();
        }

        function calcularTeoricaEmTempoReal() {
            const peso = parseFloat(document.getElementById("anel-pesoFinal").value);
            const campoTeorica = document.getElementById("anel-teorica");

            if (!isNaN(peso) && peso > 0) {
                const teorica = (((peso * 1.7071) / 100) / 500) * 1000;
                campoTeorica.value = teorica.toFixed(6);
            } else {
                campoTeorica.value = "";
            }
        }

        async function salvarDadosPesagemAnel() {
            if (!loteAtivoId) {
                alert("Selecione ou crie um lote primeiro.");
                return;
            }

            const numAnel = document.getElementById("anel-select-pesagem").value;
            const espessura = document.getElementById("anel-espessura").value;
            const pesoFinal = document.getElementById("anel-pesoFinal").value;
            const teorica = document.getElementById("anel-teorica").value;

            const lote = lotes.find(l => l.id === loteAtivoId);
            if (!lote.aneis) lote.aneis = {};
            if (!lote.aneis[numAnel]) lote.aneis[numAnel] = {};

            lote.aneis[numAnel].espessura = espessura;
            lote.aneis[numAnel].pesoFinal = pesoFinal;
            lote.aneis[numAnel].teorica = teorica;

            await salvarLotesNoStorage();
            renderizarResumoAneisPesagem();
            alert(`Dados de pesagem do Anel ${numAnel} salvos!`);
        }

        function renderizarResumoAneisPesagem() {
            const lista = document.getElementById("rings-list-pesagem");
            const contador = document.getElementById("ring-count-pesagem");
            lista.innerHTML = "";

            const lote = lotes.find(l => l.id === loteAtivoId);
            let preenchidos = 0;

            for (let i = 1; i <= 60; i++) {
                const temDados = lote && lote.aneis && lote.aneis[i] && (lote.aneis[i].espessura || lote.aneis[i].pesoFinal);
                if (temDados) preenchidos++;

                const card = document.createElement("div");
                card.className = "ring-item " + (temDados ? "filled" : "");
                card.innerHTML = `
                    <div class="ring-number">Anel ${i}</div>
                    <div class="ring-status-text">${temDados ? "Configurado" : "Pendente"}</div>
                `;
                card.onclick = () => {
                    document.getElementById("anel-select-pesagem").value = i;
                    carregarDadosAnelPesagem();
                };
                lista.appendChild(card);
            }

            contador.innerText = `${preenchidos} de 60 configurados`;
        }

        /* TELA 3 - DISSOLUÇÃO DE HORA EM HORA */
        function renderizarTabelaDissolucao() {
            const tbody = document.getElementById("dissolution-tbody");
            tbody.innerHTML = "";

            for (let i = 1; i <= 13; i++) {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>#${i}</strong></td>
                    <td>${Math.round((60 / 12) * (i - 1))} min</td>
                    <td>
                        <input type="number" step="any" class="input-ab" id="ab-${i}" oninput="calcularConcentracao(${i})" placeholder="0.0000">
                    </td>
                    <td>
                        <input type="text" id="conc-${i}" readonly placeholder="-">
                    </td>
                `;
                tbody.appendChild(tr);
            }
        }

        function calcularConcentracao(indice) {
            const abInput = document.getElementById(`ab-${indice}`);
            const concInput = document.getElementById(`conc-${indice}`);
            const abValor = parseFloat(abInput.value);
            const aplicarGeral = document.getElementById("aplicarAbsorcaoGeral").value === "sim";
            
            const numAnel = document.getElementById("anel-select-dissolucao").value;
            const lote = lotes.find(l => l.id === loteAtivoId);
            const teorica = lote && lote.aneis && lote.aneis[numAnel] ? parseFloat(lote.aneis[numAnel].teorica) : NaN;

            if (!isNaN(abValor)) {
                let conc = (abValor - 0.0016) / 61.89;
                
                if (aplicarGeral && !isNaN(teorica) && teorica > 0) {
                    let pct = (conc / teorica) * 100;
                    concInput.value = pct.toFixed(2) + "%";
                } else {
                    concInput.value = conc.toFixed(6);
                }
            } else {
                concInput.value = "";
            }
        }

        function atualizarCalculosDissolucao() {
            const aplicarGeral = document.getElementById("aplicarAbsorcaoGeral").value === "sim";
            document.getElementById("th-resultado").innerText = aplicarGeral ? "Absorção Geral (%)" : "Concentração";
            
            for (let i = 1; i <= 13; i++) {
                calcularConcentracao(i);
            }
        }

        function carregarDadosAnelDissolucao() {
            const numAnel = document.getElementById("anel-select-dissolucao").value;
            const lote = lotes.find(l => l.id === loteAtivoId);

            limparPontosDissolucao();

            if (!lote || !lote.aneis || !lote.aneis[numAnel]) {
                document.getElementById("aplicarAbsorcaoGeral").value = "nao";
                alternarBloqueioCamposDissolucao(false);
                atualizarCalculosDissolucao();
                return;
            }

            const dados = lote.aneis[numAnel];
            document.getElementById("aplicarAbsorcaoGeral").value = dados.aplicarAbsorcaoGeral || "nao";

            const pontos = dados.pontos || {};
            for (let i = 1; i <= 13; i++) {
                if (pontos[i]) {
                    document.getElementById(`ab-${i}`).value = pontos[i].ab || "";
                }
            }

            atualizarCalculosDissolucao();
            alternarBloqueioCamposDissolucao(!!dados.finalizado);
        }

        function limparPontosDissolucao() {
            for (let i = 1; i <= 13; i++) {
                document.getElementById(`ab-${i}`).value = "";
                document.getElementById(`conc-${i}`).value = "";
            }
        }

        function alternarBloqueioCamposDissolucao(bloquear) {
            document.getElementById("aplicarAbsorcaoGeral").disabled = bloquear;
            document.getElementById("btn-salvar-dissolucao").disabled = bloquear;
            document.getElementById("btn-finalizar-anel").disabled = bloquear;

            for (let i = 1; i <= 13; i++) {
                document.getElementById(`ab-${i}`).disabled = bloquear;
            }
        }

        async function salvarDissolucaoAnel(finalizar = false) {
            if (!loteAtivoId) {
                alert("Selecione um lote primeiro.");
                return;
            }

            const numAnel = document.getElementById("anel-select-dissolucao").value;
            const lote = lotes.find(l => l.id === loteAtivoId);
            if (!lote.aneis) lote.aneis = {};
            if (!lote.aneis[numAnel]) lote.aneis[numAnel] = {};

            const pontos = {};
            for (let i = 1; i <= 13; i++) {
                pontos[i] = {
                    ab: document.getElementById(`ab-${i}`).value,
                    conc: document.getElementById(`conc-${i}`).value
                };
            }

            lote.aneis[numAnel].aplicarAbsorcaoGeral = document.getElementById("aplicarAbsorcaoGeral").value;
            lote.aneis[numAnel].pontos = pontos;
            lote.aneis[numAnel].finalizado = finalizar;

            await salvarLotesNoStorage();
            renderizarResumoAneisDissolucao();

            if (finalizar) {
                alternarBloqueioCamposDissolucao(true);
                alert(`Anel ${numAnel} finalizado com sucesso!`);
            } else {
                alert(`Leituras de dissolução do Anel ${numAnel} salvas!`);
            }
        }

        function finalizarAnel() {
            if (!confirm("Tem certeza que deseja finalizar este anel? Não será possível editar os pontos posteriormente.")) {
                return;
            }
            salvarDissolucaoAnel(true);
        }

        function renderizarResumoAneisDissolucao() {
            const lista = document.getElementById("rings-list-dissolucao");
            const contador = document.getElementById("ring-count-dissolucao");
            lista.innerHTML = "";

            const lote = lotes.find(l => l.id === loteAtivoId);
            let finalizados = 0;

            for (let i = 1; i <= 60; i++) {
                const dados = lote && lote.aneis && lote.aneis[i];
                const isFinalizado = dados && dados.finalizado;
                if (isFinalizado) finalizados++;

                let classeCard = "ring-item";
                if (isFinalizado) classeCard += " finished";
                else if (dados && dados.pontos) classeCard += " filled";

                const card = document.createElement("div");
                card.className = classeCard;
                card.innerHTML = `
                    <div class="ring-number">Anel ${i}</div>
                    <div class="ring-status-text">${isFinalizado ? "✓ Finalizado" : (dados && dados.pontos ? "Em andamento" : "Pendente")}</div>
                `;
                card.onclick = () => {
                    document.getElementById("anel-select-dissolucao").value = i;
                    carregarDadosAnelDissolucao();
                };
                lista.appendChild(card);
            }

            contador.innerText = `${finalizados} de 60 finalizados`;
        }

        /* UTILITÁRIOS */
        function gerarId() {
            return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        }

        function formatarData(data) {
            if (!data) return "-";
            const partes = data.split("-");
            if (partes.length !== 3) return data;
            return partes[2] + "/" + partes[1] + "/" + partes[0];
        }

// Inicializa o sistema ao carregar a página
iniciarSistema();
