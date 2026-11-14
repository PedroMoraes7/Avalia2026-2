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
    },
    {
      id: "tarefa-2",
      titulo: "Revisar os textos do portfólio",
      prioridade: "media",
      coluna: "a-fazer",
    },
    {
      id: "tarefa-3",
      titulo: "Ajustar o layout responsivo do projeto",
      prioridade: "alta",
      coluna: "em-execucao",
    },
    {
      id: "tarefa-4",
      titulo: "Responder as mensagens do Discord",
      prioridade: "baixa",
      coluna: "em-execucao",
    },
    {
      id: "tarefa-5",
      titulo: "Publicar as notas da entrega",
      prioridade: "media",
      coluna: "concluido",
    },
  ];

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

  function criarCartao(tarefa) {
    const cartao = document.createElement("article");
    cartao.className = "kanban-card";
    cartao.dataset.prioridade = tarefa.prioridade;

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
      const cartoes = tarefas.filter((tarefa) => tarefa.coluna === coluna);
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
      const total = tarefas.filter((tarefa) => tarefa.coluna === coluna).length;
      contador.textContent = String(total);
      contador.setAttribute(
        "aria-label",
        total + (total === 1 ? " tarefa" : " tarefas")
      );
    });

    const totalEl = document.getElementById("boardTotal");
    if (totalEl) totalEl.textContent = String(tarefas.length);
  }

  renderDiscordProfile();
  renderTodayLabel();
  renderBoard();
})();
