# Apólice PWA — Gestão de Seguros (offline)

Versão **PWA** do app [Apólice](../Seguro): mesmas features, mas 100% no
navegador — instalável no **iOS, Android e Windows**, funciona **offline**,
com banco **SQLite local** (sql.js/WASM persistido em IndexedDB) e **sem
autenticação**. Os dados vivem apenas no aparelho; use o Backup para
exportar/importar.

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · sql.js (SQLite WASM) ·
vite-plugin-pwa (Workbox) · React Router (HashRouter).

---

## Funcionalidades

Idênticas ao app original:

- **Dashboard gerencial** (visão Executiva/Operacional): KPIs de carteira,
  comissão estimada, seguros a vencer, parcelas a cobrar, comissão por mês e
  meta do mês.
- **Clientes**: lista em cards com tags, cadastro/edição/exclusão e detalhe com abas.
- **Detalhe do cliente**: Apólices (com parcelas), Cotações, Relacionamento,
  Sinistros e Documentos (arquivos ficam no IndexedDB do aparelho).
- **Cotação multi-seguradora** (assistente em 3 passos) com PDF por proposta,
  destaque do menor preço e oficialização gerando apólice + parcelas.
- **Parcelas**: marcar como paga, status pendente/atrasada/paga.
- **@mail**: lembretes de renovação e de parcela via e-mail padrão (mailto).
- **Agenda** de vencimentos e renovações agrupada por prazo.
- **Sinistros** com histórico e atualização de status.
- **Backup**: exporta/importa toda a base em JSON (incluindo os arquivos em
  base64; aceita também backups do app original).
- **Busca global** e **dados de exemplo** com um clique.

### Extras de PWA

- **Instalável**: banner "Instalar o Apólice" (Chrome/Edge/Android) e botão na
  sidebar; no iOS mostra as instruções (Compartilhar → Adicionar à Tela de Início).
- **Offline-first**: todo o app (JS, CSS, fontes, WASM do SQLite, ícones) fica
  em precache no service worker.
- **Atualização automática**: o app verifica a publicação a cada hora e sempre
  que volta ao primeiro plano; havendo versão nova, mostra o banner
  "Nova versão disponível → Atualizar".
- **Versão visível** na sidebar (vem do `version` do `package.json`).

## Rodar localmente

```bash
npm install
npm run dev        # desenvolvimento (sem service worker)
npm run build      # gera ícones + type-check + build em dist/
npm run preview    # serve o build (com service worker) para teste
```

## Publicar

### Vercel

1. Suba o projeto para um repositório Git e importe em https://vercel.com
   (**New Project**). O `vercel.json` já define build e headers do service
   worker — nenhuma variável de ambiente é necessária.
2. Cada `git push` gera um deploy; os apps instalados detectam e oferecem a
   atualização sozinhos.

### GitHub Pages

1. Suba para o GitHub com branch `main`.
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
3. O workflow [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)
   builda com `BASE_PATH=/<nome-do-repo>/` e publica a cada push.

## Lançar uma nova versão

1. Atualize o `version` no [package.json](package.json) (ex.: `1.1.0`) —
   é esse número que aparece na sidebar.
2. Commit + push. Depois do deploy, os apps instalados baixam o novo service
   worker e mostram o banner de atualização.

## Estrutura

```
scripts/icon.svg + generate-icons.mjs   # ícone fonte e geração dos PNGs (sharp)
src/db/
  schema.ts        # schema SQLite (espelha o Postgres do app original)
  database.ts      # sql.js + persistência em IndexedDB (debounce)
  repo.ts          # consultas e mutações (port de data.ts + actions.ts)
  files.ts         # blobs de documentos/PDFs no IndexedDB
  backup.ts        # export/import JSON (com arquivos em base64)
  seed.ts          # dados de exemplo
  DbContext.tsx    # abre o banco e re-renderiza a cada mutação
src/pwa/           # instalação, banner de atualização, indicador offline
src/lib/           # types, constants, format, mail (iguais ao original)
src/components/    # UI portada do original (shell, dashboard, cliente, cotação…)
src/pages/         # rotas (dashboard, clientes, agenda, sinistros, backup…)
```

## Observações

- **Sem autenticação e sem servidor**: qualquer pessoa com acesso ao aparelho
  acessa os dados. Eles não saem do dispositivo — não há sincronização entre
  aparelhos (use exportar/importar backup para migrar).
- Limpar os dados de navegação do site **apaga o banco**. Faça backups.
