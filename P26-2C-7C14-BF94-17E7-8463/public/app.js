(() => {
  "use strict";

  const CHAVE_PROJETO = "P26-2C-7C14-BF94-17E7-8463";

  const AVATAR_PADRAO =
    "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='32'%20fill='%233155e7'/%3E%3Ctext%20x='32'%20y='42'%20text-anchor='middle'%20font-family='Arial,sans-serif'%20font-size='26'%20font-weight='700'%20fill='%23ffffff'%3EP%3C/text%3E%3C/svg%3E";

  const discordSession = {
    user_id: "discord_" + CHAVE_PROJETO.slice(-4).toLowerCase(),
    username: "PEDRO",
    avatar: AVATAR_PADRAO,
  };

  const COLUNAS = ["a-fazer", "em-execucao", "concluido"];
  const TIPO_DADOS_CARTAO = "text/plain";

  const prioridadeTexto = {
    baixa: "baixa",
    media: "média",
    alta: "alta",
  };

  const tarefas = [
    {
      id: "tarefa-1",
      titulo: "Definir as prioridades da semana",
      prioridade: "alta",
      coluna: "a-fazer",
      posicao: 0,
    },
    {
      id: "tarefa-2",
      titulo: "Revisar os textos do portfólio",
      prioridade: "media",
      coluna: "a-fazer",
      posicao: 1,
    },
    {
      id: "tarefa-3",
      titulo: "Ajustar o layout responsivo do projeto",
      prioridade: "alta",
      coluna: "em-execucao",
      posicao: 0,
    },
    {
      id: "tarefa-4",
      titulo: "Responder as mensagens do Discord",
      prioridade: "baixa",
      coluna: "em-execucao",
      posicao: 1,
    },
    {
      id: "tarefa-5",
      titulo: "Publicar as notas da entrega",
      prioridade: "media",
      coluna: "concluido",
      posicao: 0,
    },
  ];

  let idCartaoArrastado = null;
  let colunaDestacada = null;

  function renderDiscordProfile() {
    const avatarEl = document.getElementById("discordAvatar");
    const nomeEl = document.getElementById("discordUserName");
    const idEl = document.getElementById("discordUserId");

    if (nomeEl) nomeEl.textContent = discordSession.username;
    if (idEl) idEl.textContent = discordSession.user_id;

    if (avatarEl) {
      avatarEl.alt = "Avatar de " + discordSession.username;
      avatarEl.src = discordSession.avatar;
    }
  }

  function renderTodayLabel() {
    const dataEl = document.getElementById("todayLabel");
    if (!dataEl) return;

    const hoje = new Date();
    const texto = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(hoje);

    dataEl.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function encontrarTarefa(idCartao) {
    return tarefas.find((tarefa) => tarefa.id === idCartao) || null;
  }

  function tarefasDaColuna(coluna) {
    return tarefas
      .filter((tarefa) => tarefa.coluna === coluna)
      .sort((a, b) => a.posicao - b.posicao);
  }

  function proximaPosicao(coluna) {
    const cartoes = tarefasDaColuna(coluna);
    if (cartoes.length === 0) return 0;
    return cartoes[cartoes.length - 1].posicao + 1;
  }

  function normalizarPosicoes(coluna) {
    tarefasDaColuna(coluna).forEach((tarefa, indice) => {
      tarefa.posicao = indice;
    });
  }

  function moverCartao(idCartao, colunaDestino) {
    if (!COLUNAS.includes(colunaDestino)) return false;

    const tarefa = encontrarTarefa(idCartao);
    if (!tarefa || tarefa.coluna === colunaDestino) return false;

    const colunaOrigem = tarefa.coluna;
    const novaPosicao = proximaPosicao(colunaDestino);

    tarefa.coluna = colunaDestino;
    tarefa.posicao = novaPosicao;

    normalizarPosicoes(colunaDestino);
    normalizarPosicoes(colunaOrigem);

    return true;
  }

  function criarCartao(tarefa) {
    const cartao = document.createElement("article");
    cartao.className = "kanban-card";
    cartao.dataset.id = tarefa.id;
    cartao.dataset.prioridade = tarefa.prioridade;
    cartao.draggable = true;
    cartao.title = "Arraste para mover de coluna";

    const titulo = document.createElement("h3");
    titulo.className = "kanban-card-title";
    titulo.textContent = tarefa.titulo;

    const meta = document.createElement("div");
    meta.className = "kanban-card-meta";

    const rotulo = document.createElement("span");
    rotulo.className = "priority-label";
    rotulo.textContent = "prioridade";

    const prioridade = prioridadeTexto[tarefa.prioridade] || tarefa.prioridade;
    const pill = document.createElement("span");
    pill.className = "priority-pill priority-pill--" + tarefa.prioridade;
    pill.textContent = prioridade;
    pill.setAttribute("aria-label", "Prioridade " + prioridade);

    meta.append(rotulo, pill);
    cartao.append(titulo, meta);

    return cartao;
  }

  function renderBoard() {
    document.querySelectorAll(".card-list[data-column]").forEach((lista) => {
      const coluna = lista.getAttribute("data-column");
      const cartoes = tarefasDaColuna(coluna);
      const fragmento = document.createDocumentFragment();

      cartoes.forEach((tarefa) => {
        fragmento.appendChild(criarCartao(tarefa));
      });

      if (cartoes.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "column-empty";
        vazio.textContent = "Nenhuma tarefa por aqui.";
        fragmento.appendChild(vazio);
      }

      lista.replaceChildren(fragmento);
    });

    document.querySelectorAll("[data-count]").forEach((contador) => {
      const coluna = contador.getAttribute("data-count");
      const total = tarefasDaColuna(coluna).length;
      contador.textContent = String(total);
      contador.setAttribute(
        "aria-label",
        total + (total === 1 ? " tarefa" : " tarefas")
      );
    });

    const totalEl = document.getElementById("boardTotal");
    if (totalEl) totalEl.textContent = String(tarefas.length);
  }

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
    document.querySelectorAll(".kanban-column.is-drag-over").forEach((coluna) => {
      coluna.classList.remove("is-drag-over");
    });
    colunaDestacada = null;
  }

  function iniciarArrasto(event) {
    const cartao = elementoDoCartao(event.target);
    if (!cartao || !cartao.dataset.id) return;

    idCartaoArrastado = cartao.dataset.id;
    cartao.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(TIPO_DADOS_CARTAO, idCartaoArrastado);
    }
  }

  function permitirSoltura(event) {
    const coluna = elementoDaColuna(event.target);
    if (!coluna) return;

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
    idCartaoArrastado = null;

    document.querySelectorAll(".kanban-card.is-dragging").forEach((cartao) => {
      cartao.classList.remove("is-dragging");
    });

    limparDestaques();
  }

  function soltarCartao(event) {
    const coluna = elementoDaColuna(event.target);
    if (!coluna) return;

    event.preventDefault();

    const idTransferido = event.dataTransfer
      ? event.dataTransfer.getData(TIPO_DADOS_CARTAO)
      : "";
    const idCartao = idTransferido || idCartaoArrastado;
    const moveu = idCartao ? moverCartao(idCartao, coluna.id) : false;

    finalizarArrasto();

    if (moveu) renderBoard();
  }

  function configurarArrastoDeCartoes() {
    const quadro = document.querySelector(".kanban-board");
    if (!quadro) return;

    quadro.addEventListener("dragstart", iniciarArrasto);
    quadro.addEventListener("dragover", permitirSoltura);
    quadro.addEventListener("dragleave", sairDaColuna);
    quadro.addEventListener("drop", soltarCartao);
    quadro.addEventListener("dragend", finalizarArrasto);
  }

  renderDiscordProfile();
  renderTodayLabel();
  renderBoard();
  configurarArrastoDeCartoes();
})();
