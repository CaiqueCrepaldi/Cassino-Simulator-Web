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

| Jogo | Mecânica | Pagamento máximo |
|------|----------|-----------------|
| 🎰 Slot Machine | 3 rolos com símbolos ponderados | 3× |
| ✈️ Aviator | Multiplicador exponencial + cash-out | Ilimitado |
| 🎡 Double | Roda com 14 segmentos animada em canvas | 14× |
| 🎲 Crash Dice | 2 dados com prioridade de prêmio | 5× |
| 🃏 Blackjack | Baralho completo com Hit/Stand/Double | 2.5× (Blackjack) |
| 🎡 Roleta | Roleta europeia com apostas múltiplas | 35× |
| 🪙 Coin Flip | 50/50 com modo automático e streak | 2× |
| 🎴 Baccarat | Regras completas de compra | 8× (Empate) |

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
    │   ├── index.ts           # Entry point Express + rota de health
    │   ├── routes/            # Um arquivo por jogo + balance
    │   └── services/          # Lógica pura de jogo (sem side-effects)
    └── tests/
        ├── services/          # Testes unitários dos serviços
        └── routes/            # Testes de integração via Supertest
```

### Fluxo de dados

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

### Decisões de design

- **Lógica no servidor**: toda validação de aposta e cálculo de resultado vive no backend. O frontend é responsável apenas por animações e UX.
- **Stateless por padrão**: serviços de jogo são funções puras (sem estado interno). O Blackjack envia o estado do baralho em cada request.
- **Saldo em memória**: sem banco de dados — adequado para um protótipo acadêmico. Persiste enquanto o servidor estiver rodando.
- **API tipada**: o `client.ts` expõe tipos de retorno para cada endpoint, evitando erros de contrato.

---

## Stack Tecnológica

### Frontend
- **React 18** — UI reativa com Suspense e lazy loading por jogo
- **TypeScript** — tipagem estrita em todo o projeto
- **Vite** — build tool moderno, HMR instantâneo
- CSS inline com dark theme (`#0d0d0d` base)

### Backend
- **Node.js 20+** com ES Modules
- **Express 4** — roteamento REST simples e performático
- **TypeScript** — tipagem nos serviços, rotas e modelos
- **tsx** — execução direta de TypeScript em desenvolvimento

### Testes
- **Vitest** — framework de testes moderno (compatível com Vite)
- **Supertest** — testes de integração HTTP sem levantar servidor real
- **63 testes**: 41 unitários (serviços) + 22 de integração (rotas)

---

## Como Executar

### Pré-requisitos
- Node.js 18+
- npm 9+

### Backend
```bash
cd backend
npm install
npm run dev        # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Testes
```bash
cd backend
npm test           # roda os 63 testes
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

---

## Histórico de Commits

O projeto foi desenvolvido com commits semânticos, um por jogo:

```
feat(frontend): integrate all games with backend REST API
feat: add backend — Express API, game services and automated tests
refactor: move frontend files into frontend/ subdirectory
feat: add Baccarat game
feat: add Blackjack game
feat: add Coin Flip game
feat: add Roulette game
feat: add Crash Dice game
feat: add Double game
feat: add Aviator game
chore: initial project setup — React + TypeScript casino simulator
```

---

## Origem do Projeto

Este projeto é a versão TypeScript/Web do [cassino-simulator](https://github.com/CaiqueCrepaldi/cassino-simulator) — protótipo original em Python com CustomTkinter.

---

## Aviso Legal

> Este projeto é estritamente acadêmico e educacional. Não envolve dinheiro real, apostas reais ou incentivo ao jogo. Os valores exibidos são fictícios e existem apenas para fins de demonstração técnica.

---

*Feito com ☕ e muito TypeScript.*
