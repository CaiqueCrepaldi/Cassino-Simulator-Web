# 🎰 Cassino Simulator Web

> **Projeto acadêmico** — simulador de jogos de cassino sem dinheiro real envolvido.

---

## A História por Trás do Projeto

Tudo começou com um protótipo simples em Python — uma janela escura com botões coloridos e a promessa de diversão sem risco. O [cassino-simulator](https://github.com/CaiqueCrepaldi/cassino-simulator) foi criado para explorar conceitos de programação orientada a eventos, animações e lógica de jogos de azar.

Com o projeto crescendo e ganhando 8 jogos distintos, surgiu um desafio natural: **como transformar essa prova de conceito em algo robusto, moderno e profissional?**

A resposta foi reescrever tudo em TypeScript — a linguagem que o mercado exige — separando responsabilidades em **frontend** e **backend**, adicionando testes automatizados reais e documentando cada decisão. O objetivo não é ensinar a jogar, mas ensinar como *sistemas* jogam: validação no servidor, lógica isolada em serviços, contratos tipados entre camadas.

---

## Descrição

**Cassino Simulator Web** é uma aplicação full-stack que replica 8 jogos clássicos de cassino em uma interface dark moderna. O backend em Express valida apostas, executa toda a lógica de jogo e gerencia o saldo. O frontend em React consome a API e entrega animações fluidas ao usuário.

Quatro jogos rodam em **modo ao vivo 24/7** (Aviator, Double, Roleta e Baccarat): o servidor mantém um loop contínuo transmitindo o estado em tempo real via **Server-Sent Events**. O histórico de cada rodada é persistido em disco para sobreviver a reinicializações.

Nenhum dinheiro real está envolvido. O saldo é virtual (R$ 1.000,00 inicial) e existe apenas em memória.

---

## Screenshots

> _Adicione screenshots aqui após executar o projeto._

| Menu Principal | Slot Machine | Aviator |
|:-:|:-:|:-:|
| `screenshot-menu.png` | `screenshot-slot.png` | `screenshot-aviator.png` |

| Blackjack | Roleta | Double |
|:-:|:-:|:-:|
| `screenshot-blackjack.png` | `screenshot-roulette.png` | `screenshot-double.png` |

---

## Jogos Disponíveis

| Jogo | Modo | Mecânica | Pagamento máximo |
|------|------|----------|-----------------|
| 🎰 Slot Machine | Clássico | 3 rolos com símbolos ponderados | 3× |
| ✈️ Aviator | **Ao vivo 24/7** | Multiplicador exponencial + cash-out | Ilimitado |
| 🎡 Double | **Ao vivo 24/7** | Roda com 14 segmentos animada em canvas | 14× |
| 🎲 Crash Dice | Clássico | 2 dados com prioridade de prêmio | 5× |
| 🃏 Blackjack | Clássico | Baralho completo com Hit/Stand/Double | 2.5× (Blackjack) |
| 🎡 Roleta | **Ao vivo 24/7** | Roleta europeia com apostas múltiplas | 35× |
| 🪙 Coin Flip | Clássico | 50/50 com modo automático e streak | 2× |
| 🎴 Baccarat | **Ao vivo 24/7** | Regras completas de compra | 8× (Empate) |

---

## Arquitetura

```
cassino-simulator-web/
├── frontend/                  # React 18 + TypeScript + Vite
│   └── src/
│       ├── api/
│       │   └── client.ts      # Typed fetch wrappers para a API
│       ├── components/
│       │   └── Menu.tsx       # Tela inicial com saldo e navegação
│       └── games/
│           ├── GameShell.tsx  # Layout compartilhado (header + voltar)
│           ├── LiveIndicator.tsx  # Indicador AO VIVO / RECONECTANDO
│           ├── SlotMachine.tsx
│           ├── Aviator.tsx
│           ├── Double.tsx
│           ├── CrashDice.tsx
│           ├── Roulette.tsx
│           ├── CoinFlip.tsx
│           ├── Blackjack.tsx
│           └── Baccarat.tsx
│
└── backend/                   # Node.js + Express + TypeScript
    ├── src/
    │   ├── balance.ts         # Saldo em memória (deduct / credit / reset)
    │   ├── persist.ts         # Persistência do histórico em game-history.json
    │   ├── index.ts           # Entry point Express + rota de health
    │   ├── gameLoop/          # Loops 24/7 dos jogos ao vivo
    │   │   ├── subscribeSSE.ts    # Helper SSE compartilhado
    │   │   ├── AviatorRoom.ts
    │   │   ├── RouletteRoom.ts
    │   │   ├── DoubleRoom.ts
    │   │   └── BaccaratRoom.ts
    │   ├── routes/            # Um arquivo por jogo + balance
    │   │   ├── stream.ts      # GET /api/live/:game/stream (SSE)
    │   │   └── livebet.ts     # POST /api/live/:game/bet (apostas ao vivo)
    │   └── services/          # Lógica pura de jogo (sem side-effects)
    ├── src/*.test.ts          # Testes unitários colocalizados
    └── tests/
        ├── services/          # Testes unitários dos serviços
        └── routes/            # Testes de integração via Supertest
```

### Fluxo de dados — Jogos Clássicos

```
Usuário → [React Component]
            ↓ api.slot.spin(bet)
          [client.ts — fetch POST /api/games/slot/spin]
            ↓ HTTP
          [Express Route — deduct → service → credit]
            ↓ JSON { reels, win, prize, balance }
          [React Component — onBalanceChange(balance)]
            ↓
          Animação + resultado exibido
```

### Fluxo de dados — Jogos Ao Vivo (SSE)

```
Servidor                              Frontend
────────                              ────────
GameRoom (loop 24/7)
  betting phase (20s countdown)  →  EventSource /api/live/aviator/stream
  flying phase (100ms ticks)     →  onmessage → atualiza canvas/animação
  crashed phase (5s countdown)   →  exibe resultado + histórico

Usuário aposta:
  POST /api/live/aviator/bet     →  GameRoom.setPendingBet()
                                    (liquidado no início do próximo voo)
```

### Decisões de design

- **Lógica no servidor**: toda validação de aposta e cálculo de resultado vive no backend. O frontend é responsável apenas por animações e UX.
- **Loops ao vivo**: os quatro jogos ao vivo rodam em `while(true)` assíncronos com `try/catch` e recuperação automática de erros — o loop nunca para.
- **SSE em vez de WebSocket**: Server-Sent Events são suficientes para o fluxo unidirecional servidor→cliente, mais simples de escalar e sem dependências extras.
- **Persistência leve**: o histórico de cada jogo ao vivo é salvo em `game-history.json` via `fs/promises.writeFile` (não-bloqueante). Sem banco de dados.
- **Stateless por padrão**: serviços de jogo clássicos são funções puras (sem estado interno). O Blackjack envia o estado do baralho em cada request.
- **API tipada**: o `client.ts` expõe tipos de retorno para cada endpoint, evitando erros de contrato.
- **Validação de entrada**: todas as rotas de aposta ao vivo validam tipo, faixa e enumeração dos parâmetros antes de processar.

---

## Stack Tecnológica

### Frontend
- **React 18** — UI reativa com Suspense e lazy loading por jogo
- **TypeScript** — tipagem estrita em todo o projeto
- **Vite** — build tool moderno, HMR instantâneo
- **EventSource (SSE)** — conexão ao vivo com auto-reconexão nativa
- CSS inline com dark theme (`#0d0d0d` base)

### Backend
- **Node.js 20+** com ES Modules
- **Express 4** — roteamento REST simples e performático
- **TypeScript** — tipagem nos serviços, rotas e modelos
- **tsx** — execução direta de TypeScript em desenvolvimento
- **SSE** — `text/event-stream` com heartbeat a cada 20s para manter conexões vivas

### Testes
- **Vitest** — framework de testes moderno (compatível com Vite)
- **Supertest** — testes de integração HTTP sem levantar servidor real
- **98 testes**: unitários (serviços + balance) + integração (rotas)

---

## Como Executar

### Pré-requisitos
- Node.js 18+
- npm 9+

### Iniciar tudo de uma vez (recomendado)
```bash
# Na raiz do projeto (instala dependências da raiz uma única vez)
npm install
# Inicia backend (porta 3001) + frontend (porta 5173) simultaneamente
npm run dev:live
```

### Ou separadamente
```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

### Testes
```bash
cd backend
npm test           # roda os 98 testes
npm run test:watch # modo watch
```

### Variáveis de ambiente (opcional)
```bash
# frontend/.env.local
VITE_API_URL=http://localhost:3001

# backend
PORT=3001
```

---

## API Reference

### Jogos Clássicos

| Método | Endpoint | Body | Descrição |
|--------|----------|------|-----------|
| `GET`  | `/api/balance` | — | Retorna saldo atual |
| `POST` | `/api/balance/reset` | — | Reseta para R$ 1.000 |
| `POST` | `/api/games/slot/spin` | `{ bet }` | Gira os rolos |
| `POST` | `/api/games/aviator/generate` | `{ bet }` | Gera ponto de crash |
| `POST` | `/api/games/aviator/settle` | `{ bet, crashAt, cashedOutAt }` | Liquida rodada |
| `POST` | `/api/games/double/spin` | `{ bet, chosen }` | Gira a roda |
| `POST` | `/api/games/crash-dice/roll` | `{ bet, numbers[] }` | Rola os dados |
| `POST` | `/api/games/roulette/spin` | `{ bets[] }` | Gira a roleta |
| `POST` | `/api/games/coin-flip/flip` | `{ bet, chosen }` | Lança a moeda |
| `POST` | `/api/games/blackjack/deal` | `{ bet }` | Distribui cartas |
| `POST` | `/api/games/blackjack/hit` | `{ playerHand, deck }` | Pede mais uma carta |
| `POST` | `/api/games/blackjack/stand` | `{ bet, playerHand, dealerHand, deck, doubled? }` | Passa a vez |
| `POST` | `/api/games/baccarat/deal` | `{ bet, chosen }` | Joga baccarat completo |

### Jogos Ao Vivo (SSE)

| Método | Endpoint | Body | Descrição |
|--------|----------|------|-----------|
| `GET`  | `/api/live/aviator/stream` | — | Stream SSE do Aviator |
| `GET`  | `/api/live/roulette/stream` | — | Stream SSE da Roleta |
| `GET`  | `/api/live/double/stream` | — | Stream SSE do Double |
| `GET`  | `/api/live/baccarat/stream` | — | Stream SSE do Baccarat |
| `POST` | `/api/live/aviator/bet` | `{ bet, roundId }` | Aposta no Aviator ao vivo |
| `POST` | `/api/live/roulette/bet` | `{ bets[], roundId }` | Aposta na Roleta ao vivo |
| `POST` | `/api/live/double/bet` | `{ bet, chosen, roundId }` | Aposta no Double ao vivo |
| `POST` | `/api/live/baccarat/bet` | `{ bet, chosen, roundId }` | Aposta no Baccarat ao vivo |

---

## Histórico de Commits

O projeto foi desenvolvido com commits semânticos, um por jogo:

```
feat: 24/7 live game loops, SSE countdowns, history persistence, 98 automated tests
feat: Aviator canvas animation, 24/7 loop, card deal animations
feat: complete visual redesign — Orbitron, glassmorphism, glow effects
fix: make vite base path configurable via env var
ci: add Render config and wire VITE_API_URL secret into Pages build
ci: add GitHub Actions workflow for Pages deployment
feat(frontend): integrate all games with backend REST API
feat: add backend — Express API, game services and automated tests
...
```

---

## Origem do Projeto

Este projeto é a versão TypeScript/Web do [cassino-simulator](https://github.com/CaiqueCrepaldi/cassino-simulator) — protótipo original em Python com CustomTkinter.

---

## Aviso Legal

> Este projeto é estritamente acadêmico e educacional. Não envolve dinheiro real, apostas reais ou incentivo ao jogo. Os valores exibidos são fictícios e existem apenas para fins de demonstração técnica.

---

*Feito com ☕ e muito TypeScript.*
