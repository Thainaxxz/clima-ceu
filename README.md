# céu — clima com contexto

Dashboard meteorológico responsivo em HTML, CSS e JavaScript puro. Usa APIs públicas da Open-Meteo e dados do NOAA Climate Prediction Center (NOAA CPC), sem chave de API.

## Rodar localmente

Como o projeto usa `fetch`, rode por um servidor HTTP local (não abra `index.html` diretamente).

### Opção 1 — VS Code
Instale a extensão **Live Server**, clique com o botão direito em `index.html` e selecione **Open with Live Server**.

### Opção 2 — Python
Na pasta do projeto, execute:

```bash
python -m http.server 5500
```

Abra `http://localhost:5500`.

## Deploy na Netlify, Vercel ou GitHub Pages

O front-end é estático e não precisa de build command. O projeto inclui uma função serverless pequena para consultar a série RONI da NOAA sem depender de CORS: `api/enso.js` para Vercel e `netlify/functions/enso.js` + `netlify.toml` para Netlify. Ao publicar em um desses provedores, mantenha esses arquivos e a configuração juntos. No servidor local, o site tenta usar as funções e depois tenta consultar a NOAA diretamente; se o CORS bloquear, o cartão informa a indisponibilidade e mantém o link oficial.

## Recursos

- Clima atual, sensação térmica, vento, umidade, UV e nascer/pôr do sol.
- Busca de cidades com geocoding Open-Meteo e opção de usar a localização do navegador.
- Curva SVG interativa para as próximas horas e previsão de sete dias.
- Comparativo opcional entre duas cidades.
- Painel ENSO com leitura automática do índice RONI publicado pela NOAA CPC e link para o boletim oficial.
- Monitor global com mapa interativo e ranking de 12 cidades de diferentes regiões.
- Temperatura atual e anomalia da máxima prevista em relação à média das máximas diárias do mês correspondente no período 1991–2020.
- Referências históricas guardadas no `localStorage` por cidade/mês para evitar chamadas repetidas.
- Fundo reativo ao tempo, chuva visual sutil, glassmorphism, skeletons, responsividade e tema claro/escuro.

## Como interpretar o monitor global

O ranking acompanha uma **amostra de 12 cidades**, não todas as localidades do planeta. A temperatura atual vem da previsão/condição corrente da Open-Meteo. A anomalia compara a máxima prevista para o dia com a média das máximas diárias para o mesmo mês entre 1991 e 2020, calculada a partir do histórico meteorológico ERA5 disponibilizado pela Open-Meteo.

A anomalia mostra se a máxima prevista está acima ou abaixo dessa referência mensal. Ela **não atribui a diferença ao El Niño**. O ENSO muda probabilidades de padrões regionais, mas não explica sozinho todo episódio de calor. A interpretação oficial também considera a atmosfera e as previsões dos modelos.

## Fontes

- Open-Meteo Forecast API: https://open-meteo.com/en/docs
- Open-Meteo Geocoding API: https://open-meteo.com/en/docs/geocoding-api
- Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api
- NOAA CPC — série RONI: https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt
- NOAA CPC — discussão diagnóstica ENSO: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml
- Mapa: Leaflet (https://leafletjs.com/) e tiles do OpenStreetMap (https://www.openstreetmap.org/copyright).

## Limites e disponibilidade

- Os dados dependem de internet e disponibilidade dos serviços externos.
- O índice NOAA é carregado do arquivo oficial por uma função serverless no deploy. Em servidor local sem funções, a consulta direta pode ser bloqueada por CORS; nesse caso, o site mostrará um aviso e manterá o link para a fonte oficial.
- O mapa depende do carregamento da biblioteca Leaflet e dos tiles do OpenStreetMap; se não carregarem, o ranking textual ainda pode ser usado.
- Consulte os termos da Open-Meteo para condições de uso e atribuição, especialmente em aplicações comerciais.
