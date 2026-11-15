(() => {
  "use strict";

  const COLUNAS = ["a-fazer", "em-execucao", "concluido"];
  const PRIORIDADES = ["baixa", "media", "alta"];
  const TIPO_DADOS_CARTAO = "text/plain";
  const TITULO_MAX_CARACTERES = 120;

  const prioridadeTexto = {
    baixa: "baixa",
    media: "média",
    alta: "alta",
  };

  let usuario = null;
  let cartoes = [];
  let idArrastado = null;
  let colunaDestacada = null;
  let operacaoEmAndamento = false;
  let mensagemTimer = null;

  const perfilEl = document.getElementById("discordProfile");
  const avatarEl = document.getElementById("discordAvatar");
  const avatarFallbackEl = document.getElementById("discordAvatarFallback");
  const nomeEl = document.getElementById("discordUserName");
  const userIdEl = document.getElementById("discordUserId");
  const loginLinkEl = document.getElementById("discordLoginLink");
  const statusEl = document.getElementById("appStatus");
  const loginPromptEl = document.getElementById("loginPrompt");
  const boardAreaEl = document.getElementById("boardArea");
  const boardTotalEl = document.getElementById("boardTotal");
  const todayLabelEl = document.getElementById("todayLabel");
  const formCriarEl = document.getElementById("createCardForm");
  const inputNovoTituloEl = document.getElementById("novoTitulo");
  const selectNovaPrioridadeEl = document.getElementById("novaPrioridade");
  const botaoCriarEl = document.getElementById("criarCartaoBtn");
  const quadroEl = document.querySelector(".kanban-board");

  /* ------------------------------------------------------------------ */
  /* Mensagens e estado de carregamento                                  */
  /* ------------------------------------------------------------------ */

  function definirMensagem(texto, tipo = "info", opcoes = {}) {
    const { ariaBusy = false, autoLimpar = false } = opcoes;

    if (mensagemTimer !== null) {
      window.clearTimeout(mensagemTimer);
      mensagemTimer = null;
    }

    if (!statusEl) return;

    statusEl.textContent = texto || "";
    statusEl.className = "app-status" + (tipo ? " app-status--" + tipo : "");
    statusEl.hidden = !texto;

    if (ariaBusy && texto) {
      statusEl.setAttribute("aria-busy", "true");
    } else {
      statusEl.removeAttribute("aria-busy");
    }

    if (texto && autoLimpar) {
      mensagemTimer = window.setTimeout(() => {
        mensagemTimer = null;
        definirMensagem("", "info");
      }, 4000);
    }
  }

  function mensagemPadrao(status) {
    switch (status) {
      case 400:
        return "Não foi possível concluir a ação: os dados enviados são inválidos.";
      case 401:
        return "Sua sessão expirou. Entre novamente com o Discord.";
      case 404:
        return "O cartão não foi encontrado. Atualize o quadro e tente novamente.";
      case 500:
        return "O servidor encontrou um erro. Tente novamente em instantes.";
      default:
        return "Não foi possível concluir a ação. Tente novamente.";
    }
  }

  async function chamarApi(caminho, opcoes = {}) {
    const init = {
      method: opcoes.metodo || "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };

    if (opcoes.corpo !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opcoes.corpo);
    }

    let resposta;
    try {
      resposta = await fetch(caminho, init);
    } catch {
      return {
        ok: false,
        status: 0,
        dados: null,
        mensagem:
          "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      };
    }

    let dados = null;
    try {
      const texto = await resposta.text();
      if (texto) dados = JSON.parse(texto);
    } catch {
      dados = null;
    }

    const mensagemServidor =
      dados && typeof dados.message === "string" ? dados.message.trim() : "";

    return {
      ok: resposta.ok,
      status: resposta.status,
      dados,
      mensagem: mensagemServidor || mensagemPadrao(resposta.status),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Sessão e cabeçalho                                                  */
  /* ------------------------------------------------------------------ */

  function normalizarUsuario(bruto) {
    if (!bruto || typeof bruto !== "object") return null;

    const userId = String(bruto.userId || bruto.user_id || "").trim();
    if (!userId) return null;

    return {
      userId,
      username:
        typeof bruto.username === "string" ? bruto.username.trim() : "",
      avatar: typeof bruto.avatar === "string" ? bruto.avatar.trim() : "",
    };
  }

  function urlAvatar(dados) {
    const avatar = dados.avatar;
    if (!avatar) return null;

    // O backend pode devolver a URL completa do Discord (fluxo OAuth2 real).
    if (/^https?:\/\//i.test(avatar)) {
      return avatar.includes("?") ? avatar : avatar + "?size=64";
    }

    // Caso o avatar venha apenas como hash, monta a URL pedida.
    return (
      "https://cdn.discordapp.com/avatars/" +
      encodeURIComponent(dados.userId) +
      "/" +
      encodeURIComponent(avatar) +
      ".png?size=64"
    );
  }

  function mostrarInicial(nome) {
    const letra = (nome.trim().charAt(0) || "?").toLocaleUpperCase("pt-BR");

    if (avatarEl) avatarEl.hidden = true;
    if (avatarFallbackEl) {
      avatarFallbackEl.textContent = letra;
      avatarFallbackEl.hidden = false;
    }
  }

  function mostrarPerfil(dados) {
    usuario = dados;

    if (perfilEl) perfilEl.hidden = false;
    if (loginLinkEl) loginLinkEl.hidden = true;
    if (boardAreaEl) boardAreaEl.hidden = false;
    if (loginPromptEl) loginPromptEl.hidden = true;

    const nome = dados.username || "Usuário Discord";
    if (nomeEl) nomeEl.textContent = nome;
    if (userIdEl) userIdEl.textContent = "ID " + dados.userId;

    const url = urlAvatar(dados);
    if (url && avatarEl) {
      if (avatarFallbackEl) avatarFallbackEl.hidden = true;
      avatarEl.alt = "Foto de " + nome;
      avatarEl.hidden = false;
      avatarEl.src = url;
    } else {
      mostrarInicial(nome);
    }
  }

  function mostrarNaoLogado() {
    usuario = null;
    cartoes = [];

    if (perfilEl) perfilEl.hidden = true;
    if (loginLinkEl) loginLinkEl.hidden = false;
    if (boardAreaEl) boardAreaEl.hidden = true;
    if (loginPromptEl) loginPromptEl.hidden = false;

    renderizarQuadro();
  }

  function perderSessao() {
    operacaoEmAndamento = false;
    mostrarNaoLogado();
    definirMensagem(
      "Sua sessão expirou. Entre novamente com o Discord.",
      "erro"
    );
  }

  function aoFalharAvatar() {
    if (!usuario) return;
    mostrarInicial(usuario.username || "Usuário Discord");
  }

  /* ------------------------------------------------------------------ */
  /* Dados                                                               */
  /* ------------------------------------------------------------------ */

  function normalizarCartao(bruto) {
    if (!bruto || typeof bruto !== "object") return null;

    const id = Number(bruto.id);
    if (!Number.isSafeInteger(id) || id <= 0) return null;

    const titulo = typeof bruto.titulo === "string" ? bruto.titulo : "";
    if (!titulo.trim()) return null;

    const numeroPosicao = Number(bruto.posicao);

    return {
      id,
      titulo,
      prioridade: PRIORIDADES.includes(bruto.prioridade)
        ? bruto.prioridade
        : "media",
      coluna: COLUNAS.includes(bruto.coluna) ? bruto.coluna : COLUNAS[0],
      posicao:
        Number.isInteger(numeroPosicao) && numeroPosicao >= 0
          ? numeroPosicao
          : 0,
    };
  }

  function extrairCartoes(dados) {
    const lista = dados && Array.isArray(dados.cards) ? dados.cards : [];
    return lista.map(normalizarCartao).filter(Boolean);
  }

  function cartoesDaColuna(coluna) {
    return cartoes
      .filter((cartao) => cartao.coluna === coluna)
      .sort((a, b) => a.posicao - b.posicao || a.id - b.id);
  }

  function renumerarColuna(coluna) {
    cartoesDaColuna(coluna).forEach((cartao, indice) => {
      cartao.posicao = indice;
    });
  }

  function moverLocalmente(cartao, colunaDestino, indiceDestino) {
    const colunaOrigem = cartao.coluna;

    const listaDestino = cartoesDaColuna(colunaDestino).filter(
      (item) => item.id !== cartao.id
    );
    const indice = Math.max(0, Math.min(indiceDestino, listaDestino.length));
    listaDestino.splice(indice, 0, cartao);
    listaDestino.forEach((item, novaPosicao) => {
      item.coluna = colunaDestino;
      item.posicao = novaPosicao;
    });

    if (colunaOrigem !== colunaDestino) {
      cartoesDaColuna(colunaOrigem).forEach((item, novaPosicao) => {
        item.posicao = novaPosicao;
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Requisições de cartões                                              */
  /* ------------------------------------------------------------------ */

  async function carregarCartoes(opcoes = {}) {
    const silencioso = Boolean(opcoes.silencioso);

    if (!silencioso) {
      definirMensagem("Carregando cartões...", "carregando", {
        ariaBusy: true,
      });
    }

    const resultado = await chamarApi("/api/cards");

    if (resultado.status === 401) {
      perderSessao();
      return;
    }

    if (!resultado.ok) {
      definirMensagem(resultado.mensagem, "erro");
      return;
    }

    cartoes = extrairCartoes(resultado.dados);
    renderizarQuadro();

    if (!silencioso) definirMensagem("", "info");
  }

  async function sincronizarCartoes() {
    const resultado = await chamarApi("/api/cards");

    if (resultado.status === 401) {
      perderSessao();
      return;
    }

    if (!resultado.ok) return;

    cartoes = extrairCartoes(resultado.dados);
    renderizarQuadro();
  }

  async function aoCriarCartao(event) {
    event.preventDefault();

    if (!usuario) {
      perderSessao();
      return;
    }
    if (operacaoEmAndamento) return;

    const titulo = inputNovoTituloEl
      ? inputNovoTituloEl.value.trim()
      : "";
    const prioridade = selectNovaPrioridadeEl
      ? selectNovaPrioridadeEl.value
      : "media";

    if (!titulo) {
      definirMensagem("Digite um título para o cartão.", "erro");
      if (inputNovoTituloEl) inputNovoTituloEl.focus();
      return;
    }

    if (titulo.length > TITULO_MAX_CARACTERES) {
      definirMensagem(
        "O título deve ter no máximo " +
          TITULO_MAX_CARACTERES +
          " caracteres.",
        "erro"
      );
      return;
    }

    if (!PRIORIDADES.includes(prioridade)) {
      definirMensagem("Escolha uma prioridade válida.", "erro");
      return;
    }

    operacaoEmAndamento = true;
    if (botaoCriarEl) {
      botaoCriarEl.disabled = true;
      botaoCriarEl.textContent = "Adicionando...";
    }
    definirMensagem("Criando cartão...", "carregando", { ariaBusy: true });

    const resultado = await chamarApi("/api/cards", {
      metodo: "POST",
      corpo: { titulo, prioridade, coluna: "a-fazer" },
    });

    operacaoEmAndamento = false;
    if (botaoCriarEl) {
      botaoCriarEl.disabled = false;
      botaoCriarEl.textContent = "Adicionar cartão";
    }

    if (resultado.status === 401) {
      perderSessao();
      return;
    }

    if (!resultado.ok) {
      definirMensagem(resultado.mensagem, "erro");
      return;
    }

    const novo =
      resultado.dados && resultado.dados.card
        ? normalizarCartao(resultado.dados.card)
        : null;

    if (novo) {
      cartoes.push(novo);
      renderizarQuadro();
    } else {
      await carregarCartoes({ silencioso: true });
    }

    if (formCriarEl) formCriarEl.reset();
    if (selectNovaPrioridadeEl) selectNovaPrioridadeEl.value = "media";
    if (inputNovoTituloEl) inputNovoTituloEl.focus();

    definirMensagem("Cartão criado em A Fazer.", "sucesso", {
      autoLimpar: true,
    });
  }

  function bloquearFormulario(form, bloquear, textoBotao) {
    form.querySelectorAll("input, select, button").forEach((campo) => {
      campo.disabled = bloquear;
    });

    const botao = form.querySelector('button[type="submit"]');
    if (botao && textoBotao) botao.textContent = textoBotao;
  }

  async function salvarEdicao(cartao, tituloBruto, prioridade, form) {
    if (operacaoEmAndamento) return;

    const titulo = tituloBruto.trim();
    if (!titulo) {
      definirMensagem("O título não pode ficar vazio.", "erro");
      return;
    }

    operacaoEmAndamento = true;
    bloquearFormulario(form, true, "Salvando...");
    definirMensagem("Salvando alterações...", "carregando", { ariaBusy: true });

    const resultado = await chamarApi("/api/cards/" + cartao.id, {
      metodo: "PATCH",
      corpo: { titulo, prioridade },
    });

    operacaoEmAndamento = false;

    if (resultado.status === 401) {
      perderSessao();
      return;
    }

    if (!resultado.ok) {
      bloquearFormulario(form, false, "Salvar");
      definirMensagem(resultado.mensagem, "erro");
      return;
    }

    const atualizado =
      resultado.dados && resultado.dados.card
        ? normalizarCartao(resultado.dados.card)
        : null;

    const indice = cartoes.findIndex((item) => item.id === cartao.id);
    if (indice >= 0) {
      if (atualizado) {
        cartoes[indice] = atualizado;
      } else {
        cartoes[indice].titulo = titulo;
        cartoes[indice].prioridade = prioridade;
      }
    }

    renderizarQuadro();
    definirMensagem("Cartão atualizado.", "sucesso", { autoLimpar: true });
  }

  function abrirEdicao(elemento, cartao) {
    if (operacaoEmAndamento) return;

    const form = document.createElement("form");
    form.className = "card-edit-form";

    const campoTitulo = document.createElement("label");
    campoTitulo.className = "field";
    const rotuloTitulo = document.createElement("span");
    rotuloTitulo.className = "field-label";
    rotuloTitulo.textContent = "Título";
    const inputTitulo = document.createElement("input");
    inputTitulo.className = "field-input";
    inputTitulo.type = "text";
    inputTitulo.maxLength = TITULO_MAX_CARACTERES;
    inputTitulo.required = true;
    inputTitulo.autocomplete = "off";
    inputTitulo.value = cartao.titulo;
    campoTitulo.append(rotuloTitulo, inputTitulo);

    const campoPrioridade = document.createElement("label");
    campoPrioridade.className = "field";
    const rotuloPrioridade = document.createElement("span");
    rotuloPrioridade.className = "field-label";
    rotuloPrioridade.textContent = "Prioridade";
    const selectPrioridade = document.createElement("select");
    selectPrioridade.className = "field-input";

    PRIORIDADES.forEach((valor) => {
      const opcao = document.createElement("option");
      opcao.value = valor;
      opcao.textContent = prioridadeTexto[valor];
      if (valor === cartao.prioridade) opcao.selected = true;
      selectPrioridade.appendChild(opcao);
    });

    campoPrioridade.append(rotuloPrioridade, selectPrioridade);

    const acoes = document.createElement("div");
    acoes.className = "card-edit-actions";

    const botaoSalvar = document.createElement("button");
    botaoSalvar.type = "submit";
    botaoSalvar.className = "primary-btn";
    botaoSalvar.textContent = "Salvar";

    const botaoCancelar = document.createElement("button");
    botaoCancelar.type = "button";
    botaoCancelar.className = "card-action";
    botaoCancelar.textContent = "Cancelar";
    botaoCancelar.addEventListener("click", () => renderizarQuadro());

    acoes.append(botaoSalvar, botaoCancelar);
    form.append(campoTitulo, campoPrioridade, acoes);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await salvarEdicao(cartao, inputTitulo.value, selectPrioridade.value, form);
    });

    // Mantém o título visível durante a edição, para o cartão continuar
    // identificável no quadro.
    const tituloVisivel = document.createElement("h3");
    tituloVisivel.className = "kanban-card-title";
    tituloVisivel.textContent = cartao.titulo;

    elemento.draggable = false;
    elemento.classList.add("is-editing");
    elemento.replaceChildren(tituloVisivel, form);
    inputTitulo.focus();
    inputTitulo.select();
  }

  async function excluirCartao(cartao) {
    if (operacaoEmAndamento) return;

    operacaoEmAndamento = true;
    definirMensagem("Apagando cartão...", "carregando", { ariaBusy: true });

    const resultado = await chamarApi("/api/cards/" + cartao.id, {
      metodo: "DELETE",
    });

    operacaoEmAndamento = false;

    if (resultado.status === 401) {
      perderSessao();
      return;
    }

    if (!resultado.ok) {
      renderizarQuadro();
      definirMensagem(resultado.mensagem, "erro");
      return;
    }

    cartoes = cartoes.filter((item) => item.id !== cartao.id);
    renumerarColuna(cartao.coluna);
    renderizarQuadro();

    definirMensagem("Cartão apagado.", "sucesso", { autoLimpar: true });
    await sincronizarCartoes();
  }

  function pedirConfirmacaoExclusao(elemento, cartao) {
    if (operacaoEmAndamento || elemento.querySelector(".card-confirm")) {
      return;
    }

    const grupo = document.createElement("div");
    grupo.className = "card-confirm";

    const texto = document.createElement("span");
    texto.className = "card-confirm-text";
    texto.textContent = "Apagar este cartão?";

    const botaoConfirmar = document.createElement("button");
    botaoConfirmar.type = "button";
    botaoConfirmar.className = "card-action card-action--danger";
    botaoConfirmar.textContent = "Confirmar";

    const botaoCancelar = document.createElement("button");
    botaoCancelar.type = "button";
    botaoCancelar.className = "card-action";
    botaoCancelar.textContent = "Cancelar";
    botaoCancelar.addEventListener("click", () => renderizarQuadro());

    botaoConfirmar.addEventListener("click", async () => {
      botaoConfirmar.disabled = true;
      botaoCancelar.disabled = true;
      await excluirCartao(cartao);
    });

    grupo.append(texto, botaoConfirmar, botaoCancelar);

    const acoes = elemento.querySelector(".card-actions");
    if (acoes) {
      acoes.replaceWith(grupo);
    } else {
      elemento.appendChild(grupo);
    }
  }

  function aoClicarNoQuadro(event) {
    const alvo = event.target;
    if (!(alvo instanceof Element)) return;

    const botao = alvo.closest("button[data-action]");
    if (!botao) return;

    const elemento = botao.closest(".kanban-card");
    if (!elemento) return;

    const id = Number(elemento.dataset.id);
    const cartao = cartoes.find((item) => item.id === id);
    if (!cartao) return;

    const acao = botao.getAttribute("data-action");
    if (acao === "editar") {
      abrirEdicao(elemento, cartao);
    } else if (acao === "apagar") {
      pedirConfirmacaoExclusao(elemento, cartao);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Renderização                                                        */
  /* ------------------------------------------------------------------ */

  function criarElementoCartao(cartao) {
    const artigo = document.createElement("article");
    artigo.className = "kanban-card";
    artigo.dataset.id = String(cartao.id);
    artigo.dataset.prioridade = cartao.prioridade;
    artigo.draggable = true;
    artigo.title = "Arraste para mover de coluna ou reordenar";

    const titulo = document.createElement("h3");
    titulo.className = "kanban-card-title";
    titulo.textContent = cartao.titulo;

    const meta = document.createElement("div");
    meta.className = "kanban-card-meta";

    const rotulo = document.createElement("span");
    rotulo.className = "priority-label";
    rotulo.textContent = "prioridade";

    const textoPrioridade =
      prioridadeTexto[cartao.prioridade] || cartao.prioridade;
    const pill = document.createElement("span");
    pill.className = "priority-pill priority-pill--" + cartao.prioridade;
    pill.textContent = textoPrioridade;
    pill.setAttribute("aria-label", "Prioridade " + textoPrioridade);

    meta.append(rotulo, pill);

    const acoes = document.createElement("div");
    acoes.className = "card-actions";

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "card-action";
    botaoEditar.dataset.action = "editar";
    botaoEditar.textContent = "Editar";
    botaoEditar.setAttribute("aria-label", "Editar cartão: " + cartao.titulo);

    const botaoApagar = document.createElement("button");
    botaoApagar.type = "button";
    botaoApagar.className = "card-action card-action--danger";
    botaoApagar.dataset.action = "apagar";
    botaoApagar.textContent = "Apagar";
    botaoApagar.setAttribute(
      "aria-label",
      "Apagar cartão: " + cartao.titulo
    );

    acoes.append(botaoEditar, botaoApagar);

    artigo.append(titulo, meta, acoes);
    return artigo;
  }

  function renderizarQuadro() {
    COLUNAS.forEach((coluna) => {
      const lista = document.querySelector(
        '.card-list[data-column="' + coluna + '"]'
      );
      if (!lista) return;

      const itens = cartoesDaColuna(coluna);
      const fragmento = document.createDocumentFragment();

      itens.forEach((cartao) => {
        fragmento.appendChild(criarElementoCartao(cartao));
      });

      if (itens.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "column-empty";
        vazio.textContent = "Nenhuma tarefa por aqui.";
        fragmento.appendChild(vazio);
      }

      lista.replaceChildren(fragmento);
    });

    document.querySelectorAll("[data-count]").forEach((contador) => {
      const coluna = contador.getAttribute("data-count");
      const total = cartoesDaColuna(coluna).length;
      contador.textContent = String(total);
      contador.setAttribute(
        "aria-label",
        total + (total === 1 ? " tarefa" : " tarefas")
      );
    });

    if (boardTotalEl) boardTotalEl.textContent = String(cartoes.length);
  }

  function renderizarData() {
    if (!todayLabelEl) return;

    const texto = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());

    todayLabelEl.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /* ------------------------------------------------------------------ */
  /* Arrastar e soltar                                                   */
  /* ------------------------------------------------------------------ */

  function elementoDaColuna(alvo) {
    return alvo instanceof Element ? alvo.closest(".kanban-column") : null;
  }

  function elementoDoCartao(alvo) {
    return alvo instanceof Element ? alvo.closest(".kanban-card") : null;
  }

  function destacarColuna(coluna) {
    if (colunaDestacada === coluna) return;

    if (colunaDestacada) {
      colunaDestacada.classList.remove("is-drag-over");
    }

    colunaDestacada = coluna;
    coluna.classList.add("is-drag-over");
  }

  function limparDestaques() {
    document
      .querySelectorAll(".kanban-column.is-drag-over")
      .forEach((coluna) => {
        coluna.classList.remove("is-drag-over");
      });
    colunaDestacada = null;
  }

  function iniciarArrasto(event) {
    if (operacaoEmAndamento) return;

    const alvo = event.target;
    if (alvo instanceof Element && alvo.closest(".card-edit-form")) return;

    const elemento = elementoDoCartao(alvo);
    if (!elemento) return;

    const id = Number(elemento.dataset.id);
    if (!Number.isSafeInteger(id) || id <= 0) return;

    idArrastado = id;
    elemento.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      try {
        event.dataTransfer.setData(TIPO_DADOS_CARTAO, String(id));
      } catch {
        /* alguns navegadores restringem o DataTransfer em testes */
      }
    }
  }

  function permitirSoltura(event) {
    const coluna = elementoDaColuna(event.target);
    if (!coluna || operacaoEmAndamento) return;

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    destacarColuna(coluna);
  }

  function sairDaColuna(event) {
    const coluna = elementoDaColuna(event.target);
    if (!coluna) return;

    const relacionado = event.relatedTarget;
    if (relacionado instanceof Node && coluna.contains(relacionado)) return;

    coluna.classList.remove("is-drag-over");
    if (colunaDestacada === coluna) {
      colunaDestacada = null;
    }
  }

  function finalizarArrasto() {
    idArrastado = null;

    document.querySelectorAll(".kanban-card.is-dragging").forEach((cartao) => {
      cartao.classList.remove("is-dragging");
    });

    limparDestaques();
  }

  async function soltarCartao(event) {
    const colunaEl = elementoDaColuna(event.target);
    if (!colunaEl) return;

    event.preventDefault();

    const transferido = event.dataTransfer
      ? event.dataTransfer.getData(TIPO_DADOS_CARTAO)
      : "";
    const id = Number(transferido || idArrastado);
    const alvoCartao = elementoDoCartao(event.target);
    const alvoId = alvoCartao ? Number(alvoCartao.dataset.id) : null;
    const clientY = Number.isFinite(event.clientY) ? event.clientY : 0;

    finalizarArrasto();

    if (operacaoEmAndamento || !usuario) return;
    if (!Number.isSafeInteger(id) || id <= 0) return;

    const cartao = cartoes.find((item) => item.id === id);
    if (!cartao) return;

    const colunaDestino = colunaEl.id;
    if (!COLUNAS.includes(colunaDestino)) return;

    if (alvoCartao && alvoId === id) return;

    const listaDestino = cartoesDaColuna(colunaDestino).filter(
      (item) => item.id !== id
    );

    let indiceDestino;
    if (!alvoCartao) {
      indiceDestino = listaDestino.length;
    } else {
      const indiceAlvo = listaDestino.findIndex((item) => item.id === alvoId);
      if (indiceAlvo === -1) {
        indiceDestino = listaDestino.length;
      } else {
        const retangulo = alvoCartao.getBoundingClientRect();
        const depois =
          clientY > retangulo.top + retangulo.height / 2;
        indiceDestino = depois ? indiceAlvo + 1 : indiceAlvo;
      }
    }

    if (
      cartao.coluna === colunaDestino &&
      cartao.posicao === indiceDestino
    ) {
      return;
    }

    const estadoAnterior = cartoes.map((item) => ({ ...item }));

    moverLocalmente(cartao, colunaDestino, indiceDestino);
    renderizarQuadro();

    operacaoEmAndamento = true;
    definirMensagem("Movendo cartão...", "carregando", { ariaBusy: true });

    const resultado = await chamarApi("/api/cards/" + id, {
      metodo: "PATCH",
      corpo: { coluna: colunaDestino, posicao: cartao.posicao },
    });

    operacaoEmAndamento = false;

    if (resultado.status === 401) {
      perderSessao();
      return;
    }

    if (!resultado.ok) {
      cartoes = estadoAnterior;
      renderizarQuadro();
      definirMensagem(resultado.mensagem, "erro");
      return;
    }

    const atualizado =
      resultado.dados && resultado.dados.card
        ? normalizarCartao(resultado.dados.card)
        : null;

    if (atualizado) {
      const indice = cartoes.findIndex((item) => item.id === atualizado.id);
      if (indice >= 0) {
        cartoes[indice] = atualizado;
      } else {
        cartoes.push(atualizado);
      }
    }

    renderizarQuadro();
    definirMensagem("Cartão movido.", "sucesso", { autoLimpar: true });
    await sincronizarCartoes();
  }

  /* ------------------------------------------------------------------ */
  /* Inicialização                                                       */
  /* ------------------------------------------------------------------ */

  function configurarEventos() {
    if (formCriarEl) formCriarEl.addEventListener("submit", aoCriarCartao);

    if (quadroEl) {
      quadroEl.addEventListener("dragstart", iniciarArrasto);
      quadroEl.addEventListener("dragover", permitirSoltura);
      quadroEl.addEventListener("dragleave", sairDaColuna);
      quadroEl.addEventListener("drop", soltarCartao);
      quadroEl.addEventListener("dragend", finalizarArrasto);
      quadroEl.addEventListener("click", aoClicarNoQuadro);
    }

    if (avatarEl) avatarEl.addEventListener("error", aoFalharAvatar);
  }

  async function iniciar() {
    configurarEventos();
    renderizarData();
    renderizarQuadro();

    definirMensagem("Carregando seu quadro...", "carregando", {
      ariaBusy: true,
    });

    const resultado = await chamarApi("/api/status");

    if (!resultado.ok) {
      mostrarNaoLogado();
      definirMensagem(resultado.mensagem, "erro");
      return;
    }

    const sessao = normalizarUsuario(
      resultado.dados ? resultado.dados.sessionUser : null
    );

    if (!sessao) {
      mostrarNaoLogado();
      definirMensagem(
        "Entre com o Discord para ver e gerenciar seus cartões.",
        "info"
      );
      return;
    }

    mostrarPerfil(sessao);
    await carregarCartoes();
  }

  iniciar();
})();
