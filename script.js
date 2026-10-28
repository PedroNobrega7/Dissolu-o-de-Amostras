        const CHAVE_STORAGE = "dissolucoes_capsulas";
        let lotes = [];
        let loteAtivoId = null;

        // Inicialização
        async function iniciarSistema() {
            await carregarLotesDoStorage();
            renderizarAnaliseExemplo();
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
                carregarPesoAnel();
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
            carregarPesoAnel();
            
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
            // O cadastro de novo lote é independente do lote ativo nas outras abas.
        }

        function limparCadastroLote() {
            ['lote-nome', 'lote-dataFilme', 'lote-bloom', 'lote-viscosidade', 'lote-umidade']
                .forEach(id => document.getElementById(id).value = '');
        }
        function gerarJsonLote(lote, agora = new Date()) {
            const dataAtual = [agora.getFullYear(), String(agora.getMonth() + 1).padStart(2, '0'), String(agora.getDate()).padStart(2, '0')].join('-');
            return [{
                sucCod: '070101',
                forCod: 'PD-01',
                plaFec: dataAtual,
                usrCod: 'Integracion',
                estCod: 12,
                cdata: [{
                    eleCod: 'E01125',
                    V01113: lote.lote,
                    V10151: lote.dataFilme,
                    V06011: lote.bloom,
                    V06438: lote.viscosidade,
                    V06750: lote.umidade
                }]
            }];
        }

        function baixarJsonLote(lote) {
            const blob = new Blob([JSON.stringify(gerarJsonLote(lote), null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'lote-' + (lote.lote.replace(/[^a-zA-Z0-9_-]/g, '_') || lote.id) + '.json';
            document.body.appendChild(link);
            try { link.click(); }
            finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
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

            const loteAtivoAnterior = loteAtivoId;
            lotes.push(novoLote);
            loteAtivoId = novoLote.id;
            if (!await salvarLotesNoStorage()) {
                lotes = lotes.filter(lote => lote.id !== novoLote.id);
                loteAtivoId = loteAtivoAnterior;
                alert('Não foi possível salvar o lote. Tente novamente.');
                return;
            }
            baixarJsonLote(novoLote);

            atualizarSelectLotes();
            limparCadastroLote();
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
            const selectSegundoDissolucao = document.getElementById('anel-select-dissolucao-2');
            selectSegundoDissolucao.innerHTML = '';
            const selectPeso = document.getElementById('anel-select-peso');
            selectPeso.innerHTML = '';

            for (let i = 1; i <= 60; i++) {
                const opt1 = document.createElement("option");
                opt1.value = i;
                opt1.textContent = "Anel " + i;
                selectPesagem.appendChild(opt1);
                selectPeso.appendChild(opt1.cloneNode(true));

                const opt2 = document.createElement("option");
                opt2.value = i;
                opt2.textContent = "Anel " + i;
                selectDissolucao.appendChild(opt2);
                selectSegundoDissolucao.appendChild(opt2.cloneNode(true));
            }
            selectSegundoDissolucao.value = '2';
        }

        // Seleção inicial; os dois campos oferecem todos os 60 anéis.
        /* TELA 2 - PESAGEM & ESPESSURA */
        function carregarDadosAnelPesagem() {
            const numAnel = document.getElementById("anel-select-pesagem").value;
            const lote = lotes.find(l => l.id === loteAtivoId);

            if (!lote || !lote.aneis || !lote.aneis[numAnel]) {
                document.getElementById("anel-espessura").value = "";
                return;
            }

            const dados = lote.aneis[numAnel];
            document.getElementById("anel-espessura").value = dados.espessura || "";
        }

        function carregarPesoAnel() {
            const lote = lotes.find(l => l.id === loteAtivoId);
            const num = document.getElementById('anel-select-peso').value;
            document.getElementById('anel-pesoFinal').value = lote?.aneis?.[num]?.pesoFinal ?? '';
            calcularTeoricaEmTempoReal();
        }

        async function salvarPesoAnel() {
            const lote = lotes.find(l => l.id === loteAtivoId);
            const num = document.getElementById('anel-select-peso').value;
            if (!lote) { alert('Selecione ou crie um lote primeiro.'); return; }
            if (!lote.aneis?.[num]) { alert('Cadastre a espessura deste anel primeiro.'); return; }
            const pesoFinal = document.getElementById('anel-pesoFinal').value;
            if (!Number.isFinite(Number(pesoFinal)) || Number(pesoFinal) <= 0) { alert('Informe um peso maior que zero.'); return; }
            calcularTeoricaEmTempoReal();
            const anterior = { ...lote.aneis[num] };
            lote.aneis[num] = { ...anterior, pesoFinal, teorica: document.getElementById('anel-teorica').value };
            if (!await salvarLotesNoStorage()) {
                lote.aneis[num] = anterior;
                alert('Não foi possível salvar o peso. Tente novamente.'); return;
            }
            renderizarResumoAneisPesagem();
            carregarDadosAnelDissolucao();
            document.getElementById('peso-feedback').textContent = `Peso do anel ${num} salvo.`;
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

            const lote = lotes.find(l => l.id === loteAtivoId);
            if (!lote) return;
            const anteriores = JSON.parse(JSON.stringify(lote.aneis || {}));
            if (!lote.aneis) lote.aneis = {};
            if (!lote.aneis[numAnel]) lote.aneis[numAnel] = {};

            lote.aneis[numAnel].espessura = espessura;

            if (!await salvarLotesNoStorage()) { lote.aneis = anteriores; alert("Não foi possível salvar a espessura. Tente novamente."); return; }
            renderizarResumoAneisPesagem();
            const proximo = Math.min(60, Number(numAnel) + 1);
            document.getElementById("anel-select-pesagem").value = proximo;
            carregarDadosAnelPesagem();
            document.getElementById("pesagem-feedback").textContent = `Anel ${numAnel} salvo. ${Number(numAnel) < 60 ? "Próximo: anel " + proximo + "." : "Você chegou ao último anel."}`;
            document.getElementById("anel-espessura").focus();
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
        function duplaSelecionada() {
            const primeiro = Number(document.getElementById('anel-select-dissolucao').value);
            return [primeiro, Number(document.getElementById('anel-select-dissolucao-2').value)];
        }

        function renderizarTabelaDissolucao() {
            const table = document.querySelector('.dissolution-table');
            table.querySelector('thead').innerHTML = `<tr><th rowspan="2">Ponto</th><th rowspan="2">Tempo (min)</th><th colspan="2" id="titulo-anel-0">Anel 1</th><th colspan="2" id="titulo-anel-1">Anel 2</th></tr><tr><th>Absorbância (Ab)</th><th id="th-resultado">Concentração</th><th>Absorbância (Ab)</th><th id="th-resultado-1">Concentração</th></tr>`;
            const tbody = document.getElementById('dissolution-tbody');
            tbody.innerHTML = '';
            for (let i = 1; i <= 13; i++) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><strong>#${i}</strong></td><td>${5 * (i - 1)} min</td>` + [0, 1].map(slot => `<td><input type="number" step="any" id="ab-${slot}-${i}" oninput="calcularConcentracao(${i}, ${slot})" placeholder="0.0000" aria-label="Absorbância do anel ${slot + 1} da dupla, ponto ${i}"></td><td><input type="text" id="conc-${slot}-${i}" readonly placeholder="-" aria-label="Resultado do anel ${slot + 1} da dupla, ponto ${i}"></td>`).join('');
                tbody.appendChild(tr);
            }
        }

        function calcularConcentracao(indice, slot = 0) {
            if (document.getElementById(`ab-${slot}-${indice}`).disabled) return;
            const ab = parseFloat(document.getElementById(`ab-${slot}-${indice}`).value);
            const resultado = document.getElementById(`conc-${slot}-${indice}`);
            const lote = lotes.find(l => l.id === loteAtivoId);
            const teorica = parseFloat(lote?.aneis?.[duplaSelecionada()[slot]]?.teorica);
            if (Number.isNaN(ab)) { resultado.value = ''; return; }
            const conc = (ab - 0.0016) / 61.89;
            resultado.value = document.getElementById('aplicarAbsorcaoGeral').value === 'sim' && teorica > 0
                ? ((conc / teorica) * 100).toFixed(2) + '%' : conc.toFixed(6);
        }

        function atualizarCalculosDissolucao() {
            const titulo = document.getElementById('aplicarAbsorcaoGeral').value === 'sim' ? 'Absorção Geral (%)' : 'Concentração';
            document.getElementById('th-resultado').textContent = titulo;
            document.getElementById('th-resultado-1').textContent = titulo;
            for (let slot = 0; slot < 2; slot++) {
                for (let i = 1; i <= 13; i++) calcularConcentracao(i, slot);
            }
        }

        function carregarDadosAnelDissolucao() {
            const lote = lotes.find(l => l.id === loteAtivoId);
            const dupla = duplaSelecionada();
            ['anel-select-dissolucao', 'anel-select-dissolucao-2'].forEach((id, slot) => {
                Array.from(document.getElementById(id).options).forEach(opcao => {
                    opcao.disabled = Number(opcao.value) === dupla[1 - slot];
                });
            });
            const dados = dupla.map(n => lote?.aneis?.[n]);
            document.getElementById('aplicarAbsorcaoGeral').value = dados.find(d => d && !d.finalizado)?.aplicarAbsorcaoGeral || dados[0]?.aplicarAbsorcaoGeral || 'nao';
            dupla.forEach((n, slot) => {
                document.getElementById(`titulo-anel-${slot}`).textContent = `Anel ${n}${dados[slot]?.finalizado ? ' · Finalizado' : ''}`;
                for (let i = 1; i <= 13; i++) {
                    const input = document.getElementById(`ab-${slot}-${i}`);
                    input.value = dados[slot]?.pontos?.[i]?.ab ?? '';
                    input.disabled = !!dados[slot]?.finalizado;
                }
            });
            atualizarCalculosDissolucao();
            // Resultados de anéis finalizados mantêm o modo de cálculo registrado.
            dados.forEach((d, slot) => {
                if (d?.finalizado) for (let i = 1; i <= 13; i++) document.getElementById(`conc-${slot}-${i}`).value = d.pontos?.[i]?.conc ?? '';
            });
            const todosFinalizados = dados.every(d => d?.finalizado);
            document.getElementById('aplicarAbsorcaoGeral').disabled = todosFinalizados;
            document.getElementById('btn-salvar-dissolucao').disabled = todosFinalizados;
            document.getElementById('btn-finalizar-anel').disabled = todosFinalizados;
        }

        async function salvarDissolucaoAnel(finalizar = false) {
            const lote = lotes.find(l => l.id === loteAtivoId);
            if (!lote) { alert('Selecione um lote primeiro.'); return; }
            const dupla = duplaSelecionada();
            if (dupla.some(n => !Number.isInteger(n) || n < 1 || n > 60) || dupla[0] === dupla[1]) {
                alert('Selecione dois anéis diferentes, de 1 a 60.'); return;
            }
            const anteriores = JSON.parse(JSON.stringify(lote.aneis || {}));
            lote.aneis ||= {};
            dupla.forEach((num, slot) => {
                if (lote.aneis[num]?.finalizado) return;
                const pontos = {};
                for (let i = 1; i <= 13; i++) pontos[i] = { ab: document.getElementById(`ab-${slot}-${i}`).value, conc: document.getElementById(`conc-${slot}-${i}`).value };
                lote.aneis[num] = { ...lote.aneis[num], pontos, aplicarAbsorcaoGeral: document.getElementById('aplicarAbsorcaoGeral').value, finalizado: finalizar };
            });
            if (!await salvarLotesNoStorage()) {
                lote.aneis = anteriores;
                alert('Não foi possível salvar a dupla. Tente novamente.');
                return;
            }
            renderizarResumoAneisDissolucao();
            carregarDadosAnelDissolucao();
            alert(`Anéis ${dupla[0]} e ${dupla[1]} ${finalizar ? 'finalizados' : 'salvos'} com sucesso!`);
        }

        function finalizarAnel() {
            const dupla = duplaSelecionada();
            if (confirm(`Finalizar os anéis ${dupla[0]} e ${dupla[1]}? Os anéis finalizados não poderão ser editados.`)) salvarDissolucaoAnel(true);
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
                    const primeiro = document.getElementById('anel-select-dissolucao');
                    const segundo = document.getElementById('anel-select-dissolucao-2');
                    if (Number(segundo.value) === i) segundo.value = primeiro.value;
                    primeiro.value = i;
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

// Exemplos exclusivos da visualização: não são gravados nos lotes do usuário.
function renderizarAnaliseExemplo() {
    const exemplos = [
        { nome: 'BIA-001', classe: 'lot-one', valores: [0, 9.2, 21.4, 35.8, 48.6, 60.1, 70.5, 78.9, 85.3, 90.2, 93.4, 95.7, 97.1] },
        { nome: 'BIA-002', classe: 'lot-two', valores: [0, 6.8, 16.9, 28.4, 40.7, 52.3, 63.1, 72.4, 80.2, 86.1, 90.5, 93.2, 95.0] },
        { nome: 'BIA-003', classe: 'lot-three', valores: [0, 12.5, 27.1, 42.6, 56.2, 68.7, 79.4, 86.8, 91.3, 94.5, 96.4, 97.8, 98.6] }
    ];
    const percentual = valor => valor.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%';
    document.getElementById('analysis-cards').innerHTML = exemplos.map(lote => `
        <article class="analysis-card ${lote.classe}">
            <span class="analysis-lot">Lote ${lote.nome}</span>
            <strong>${percentual(lote.valores[12])}</strong>
            <span>Dissolução aos 60 min</span>
        </article>`).join('');
    document.getElementById('analysis-tbody').innerHTML = exemplos[0].valores.map((_, indice) => `
        <tr><th scope="row">${indice * 5} min</th>${exemplos.map(lote => `
            <td class="${lote.classe}"><div class="analysis-value"><span>${percentual(lote.valores[indice])}</span>
            <div class="analysis-track" aria-hidden="true"><i style="width:${lote.valores[indice]}%"></i></div></div></td>`).join('')}</tr>`).join('');
}
