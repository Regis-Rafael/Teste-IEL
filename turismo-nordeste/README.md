# Dashboard Turismo Nordeste

Dashboard React com dados reais da planilha `data.xlsx`, troca de temas e totalmente responsivo.

## Como rodar localmente

```bash
npm install
npm start
```

## Deploy no Vercel

### Opção 1 — Vercel CLI
```bash
npm install -g vercel
vercel
```

### Opção 2 — GitHub + Vercel (recomendado)
1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) e clique em "New Project"
3. Importe o repositório
4. Framework: **Create React App** (detectado automaticamente)
5. Clique em **Deploy** ✅

## Atualizar os dados
Substitua o arquivo `public/data.xlsx` pelo novo arquivo com a mesma estrutura de colunas:
`Mes | Estado | Cidade | Tipo de Empreendimento | Receita Mensal (R$) | Numero de Clientes | Taxa de Ocupacao (%) | Avaliacao Media (1-5)`

## Temas disponíveis
- 🌙 Noturno (dark)
- ☀️ Solar (light)
- 🌅 Pôr do Sol (sunset)
- 🌊 Oceano (ocean)
