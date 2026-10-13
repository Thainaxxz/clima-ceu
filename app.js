const $ = (id) => document.getElementById(id);
const state = { city: {name:'Divinópolis', admin1:'Minas Gerais', country:'Brasil', latitude:-20.1436, longitude:-44.8909, timezone:'America/Sao_Paulo'}, weather:null, compare:null, debounce:null, compareDebounce:null };
const weatherCodes = {
  0:['Céu limpo','☼'],1:['Predominantemente limpo','☼'],2:['Parcialmente nublado','◐'],3:['Nublado','☁'],
  45:['Neblina','≋'],48:['Neblina com geada','≋'],51:['Garoa leve','☂'],53:['Garoa moderada','☂'],55:['Garoa intensa','☂'],
  56:['Garoa congelante leve','❄'],57:['Garoa congelante intensa','❄'],61:['Chuva leve','☂'],63:['Chuva moderada','☂'],65:['Chuva forte','☂'],
  66:['Chuva congelante leve','❄'],67:['Chuva congelante forte','❄'],71:['Neve leve','❄'],73:['Neve moderada','❄'],75:['Neve forte','❄'],
  77:['Grãos de neve','❄'],80:['Pancadas leves','☂'],81:['Pancadas moderadas','☂'],82:['Pancadas fortes','☂'],
  85:['Pancadas de neve','❄'],86:['Pancadas fortes de neve','❄'],95:['Trovoadas','ϟ'],96:['Trovoadas com granizo','ϟ'],99:['Trovoadas fortes com granizo','ϟ']
};
const fmtTime = s => s ? s.slice(11,16) : '--:--';
const round = n => Math.round(n);
const weatherInfo = code => weatherCodes[code] || ['Condição variável','◌'];
const localDate = date => new Date(`${date}T12:00:00`);
const dayName = (date, long=false) => localDate(date).toLocaleDateString('pt-BR',{weekday:long?'long':'short',timeZone:'UTC'}).replace('-feira','');
const api = async url => { const r=await fetch(url); if(!r.ok) throw new Error('Falha ao consultar dados meteorológicos.'); return r.json(); };
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200)}
function setThemeForWeather(code, currentTime){
  const rain=[51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code);
  const storm=[95,96,99].includes(code);
  document.body.dataset.weather=storm?'storm':rain?'rain':([0,1,2].includes(code)?'clear':'cloud');
  const hour=new Date(currentTime).getHours(); document.body.dataset.time=(hour<6||hour>=19)?'night':'day';
}
async function loadCity(city){
  state.city=city; $('citySearch').value=city.name; $('locationLabel').textContent=[city.admin1,city.country].filter(Boolean).join(', ');
  $('cityUpper').textContent=city.name.toLocaleUpperCase('pt-BR');$('compareCityA').textContent=city.name;
  $('suggestions').classList.add('hidden'); $('currentTemp').classList.add('skeleton-text');
  try{
    const lat=city.latitude,lon=city.longitude;
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&past_days=1&forecast_days=7&timezone=auto`;
    // A previsão deve carregar mesmo se o endpoint histórico estiver indisponível.
    const weather = await api(url);
    const dateOffset = days => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    let climate = { daily: { temperature_2m_mean: [], precipitation_sum: [] } };
    try {
      // O arquivo histórico tem atraso de publicação; evita solicitar dados de ontem.
      climate = await api(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateOffset(35)}&end_date=${dateOffset(6)}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`);
    } catch (historyError) {
      console.warn('Histórico climático indisponível; carregando apenas previsão.', historyError);
    }
    state.weather=weather;state.climate=climate; renderWeather(weather,climate); 
    if(state.compare) renderCompareA();
  }catch(e){toast('Não foi possível carregar os dados. Verifique a conexão e tente novamente.');$('conditionText').textContent='Não foi possível atualizar';}
}
function renderWeather(w,climate){
  const c=w.current,d=w.daily,h=w.hourly,info=weatherInfo(c.weather_code),today=(c.time||'').slice(0,10),idx=d.time.indexOf(today);
  $('currentTemp').classList.remove('skeleton-text');$('currentTemp').textContent=round(c.temperature_2m);$('feelsLike').textContent=round(c.apparent_temperature)+'°';
  $('conditionText').textContent=info[0];$('weatherGlyph').textContent=info[1];$('todayRange').textContent=`${round(d.temperature_2m_min[Math.max(0,idx)] )}° / ${round(d.temperature_2m_max[Math.max(0,idx)])}°`;
  $('windValue').textContent=`${round(c.wind_speed_10m)} km/h`;$('humidityValue').textContent=`${c.relative_humidity_2m}%`;
  $('uvValue').textContent=d.uv_index_max[Math.max(0,idx)]==null?'—':round(d.uv_index_max[Math.max(0,idx)]);
  $('sunrise').textContent=fmtTime(d.sunrise[Math.max(0,idx)]);$('sunset').textContent=fmtTime(d.sunset[Math.max(0,idx)]);
  const rise=new Date(d.sunrise[Math.max(0,idx)]),set=new Date(d.sunset[Math.max(0,idx)]);
  const mins=Math.max(0,Math.round((set-rise)/60000));$('dayLength').textContent=`${Math.floor(mins/60)}h ${mins%60}m de luz`;
  const now=new Date(c.time),sunrise=new Date(d.sunrise[Math.max(0,idx)]),sunset=new Date(d.sunset[Math.max(0,idx)]);
  const progress=Math.max(0,Math.min(1,(now-sunrise)/(sunset-sunrise)));$('sunMarker').style.left=`${8+progress*84}%`;
  $('sunNote').textContent=now<sunrise?'O sol ainda vai nascer.':now>sunset?'O sol já se pôs por hoje.':`O sol já percorreu ${Math.round(progress*100)}% do período de luz.`;
  setThemeForWeather(c.weather_code,c.time);renderChart(h,c.time);renderForecast(d);renderClimate(w,climate);
  $('compareTempA').textContent=`${round(c.temperature_2m)}°`;$('compareDescA').textContent=info[0];$('compareMetaA').textContent=`Sensação ${round(c.apparent_temperature)}°`;
}
function renderChart(hourly,nowString){
  const now=new Date(nowString).getTime(),times=hourly.time.map(t=>new Date(t).getTime());
  let start=times.findIndex(t=>t>=now);if(start<0)start=0;
  const indices=Array.from({length:13},(_,i)=>Math.min(start+i,times.length-1));
  const vals=indices.map(i=>hourly.temperature_2m[i]),labels=indices.map(i=>fmtTime(hourly.time[i]));
  const min=Math.floor(Math.min(...vals)-2),max=Math.ceil(Math.max(...vals)+2),W=760,H=210,L=12,R=12,T=18,B=20;
  const pts=vals.map((v,i)=>({x:L+i*(W-L-R)/(vals.length-1),y:T+(max-v)/(max-min)*(H-T-B),v,label:labels[i]}));
  const line=pts.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area=`${line} L ${pts[pts.length-1].x} ${H-B} L ${pts[0].x} ${H-B} Z`;
  const guides=[0,.5,1].map(t=>{const y=T+t*(H-T-B);return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="currentColor" opacity=".10" stroke-dasharray="3 6"/><text x="${L}" y="${y-5}" font-size="10" fill="currentColor" opacity=".5">${Math.round(max-t*(max-min))}°</text>`}).join('');
  $('tempChart').innerHTML=`<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e8a24b" stop-opacity=".25"/><stop offset="100%" stop-color="#e8a24b" stop-opacity="0"/></linearGradient></defs>${guides}<path d="${area}" fill="url(#chartFill)"/><path d="${line}" fill="none" stroke="#d99543" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p,i)=>`<circle class="chart-point" data-i="${i}" cx="${p.x}" cy="${p.y}" r="${i===0?4:2.2}" fill="${i===0?'#d99543':'#f7f5eb'}" stroke="#d99543" stroke-width="1.5"/>`).join('')}<line id="hoverLine" x1="${pts[0].x}" y1="${T}" x2="${pts[0].x}" y2="${H-B}" stroke="currentColor" opacity="0" stroke-dasharray="3 4"/>`;
  $('chartRange').textContent=`${Math.round(Math.min(...vals))}° — ${Math.round(Math.max(...vals))}°`;
  $('chartSummary').textContent=`Agora ${Math.round(vals[0])}° · ${weatherInfo(hourly.weather_code[indices[0]])[0].toLowerCase()}`;
  $('hourLabels').innerHTML=labels.filter((_,i)=>i%3===0||i===labels.length-1).map(t=>`<span>${t}</span>`).join('');
  $('tempChart').querySelectorAll('.chart-point').forEach(el=>{const p=pts[+el.dataset.i];el.addEventListener('mouseenter',()=>{el.setAttribute('r','5');const tip=$('chartTooltip');tip.innerHTML=`<strong>${p.v.toFixed(1)}°C</strong><br>${p.label}`;tip.classList.remove('hidden');tip.style.left=`${p.x/W*100}%`;tip.style.top=`${p.y/H*100}%`;const l=$('hoverLine');l.setAttribute('x1',p.x);l.setAttribute('x2',p.x);l.setAttribute('opacity','.35')});el.addEventListener('mouseleave',()=>{el.setAttribute('r',+el.dataset.i===0?4:2.2);$('chartTooltip').classList.add('hidden');$('hoverLine').setAttribute('opacity','0')})});
}
function renderForecast(d){
  const mins=d.temperature_2m_min.slice(0,7),maxs=d.temperature_2m_max.slice(0,7),lo=Math.min(...mins),hi=Math.max(...maxs);
  $('forecastGrid').innerHTML=d.time.slice(0,7).map((date,i)=>{const info=weatherInfo(d.weather_code[i]),top=(hi-maxs[i])/(hi-lo||1)*100,height=Math.max(12,(maxs[i]-mins[i])/(hi-lo||1)*100);return `<article class="forecast-day" style="animation-delay:${i*45}ms"><div class="day-name">${i===0?'Hoje':dayName(date)}</div><div class="day-glyph">${info[1]}</div><div class="range-labels"><span>${round(maxs[i])}°</span><span>${round(mins[i])}°</span></div><div class="range-bar"><span class="range-fill" style="top:${top}%;height:${height}%"></span></div><div class="rain-chance">☂ ${d.precipitation_probability_max[i]??0}%</div></article>`}).join('');
}
function renderClimate(w,climate){
  const means=climate.daily?.temperature_2m_mean?.filter(v=>v!=null)||[], rain=climate.daily?.precipitation_sum?.filter(v=>v!=null)||[];
  const currentMean=w.daily.temperature_2m_mean?.[1] ?? w.current.temperature_2m;
  if(means.length){const baseline=means.reduce((a,b)=>a+b,0)/means.length,delta=currentMean-baseline;const sign=delta>0?'+':'';$('anomalyTemp').textContent=`${sign}${delta.toFixed(1).replace('.',',')} °C vs. referência`;
    $('anomalyText').textContent=`A média prevista para hoje é ${round(currentMean)}°C. A referência recente consultada (15 dias anteriores disponíveis) ficou em ${round(baseline)}°C. Isso é uma comparação curta, não uma normal climatológica de 30 anos.`;
    $('anomalyBar').style.width=`${Math.min(100,Math.max(4,50+delta*9))}%`;
  }else{$('anomalyTemp').textContent='Histórico indisponível';$('anomalyText').textContent='Não foi possível calcular uma referência histórica para esta cidade.'}
  const total=w.daily.precipitation_sum.slice(0,7).reduce((a,b)=>a+(b||0),0),wet=w.daily.precipitation_sum.slice(0,7).filter(v=>v>=1).length;
  $('rainTotal').textContent=`${total.toFixed(1).replace('.',',')} mm`;$('rainDays').textContent=`${wet} de 7`;
  if(rain.length){const baseline=rain.reduce((a,b)=>a+b,0)/rain.length*7;$('rainAnomaly').textContent=total>baseline*1.25?'Tendência mais úmida':total<baseline*.75?'Tendência mais seca':'Próximo da referência';$('rainText').textContent=`A previsão soma ${total.toFixed(1).replace('.',',')} mm nos próximos sete dias. O período histórico recente somou em média cerca de ${baseline.toFixed(1).replace('.',',')} mm por sete dias; a amostra é curta e não representa a normal climatológica.`}else{$('rainAnomaly').textContent='Sem referência';$('rainText').textContent='A referência de precipitação não está disponível para o período consultado.'}
}
async function searchCities(q, target){
  if(q.trim().length<2){target.classList.add('hidden');return}
  try{const data=await api(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=pt&format=json`);const results=data.results||[];
    target.innerHTML=results.length?results.map((c,i)=>`<button class="suggestion" data-i="${i}">${escapeHtml(c.name)}<small>${escapeHtml([c.admin1,c.country].filter(Boolean).join(', '))}</small></button>`).join(''):'<div class="suggestion">Nenhuma cidade encontrada</div>';
    target.classList.remove('hidden');target.querySelectorAll('button[data-i]').forEach(btn=>btn.addEventListener('click',()=>{const c=results[+btn.dataset.i];const city={name:c.name,admin1:c.admin1,country:c.country,latitude:c.latitude,longitude:c.longitude,timezone:c.timezone};if(target.id==='suggestions')loadCity(city);else loadComparison(city);}));
  }catch(e){target.innerHTML='<div class="suggestion">Busca indisponível no momento</div>';target.classList.remove('hidden')}
}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('citySearch').addEventListener('input',e=>{clearTimeout(state.debounce);state.debounce=setTimeout(()=>searchCities(e.target.value,$('suggestions')),250)});
$('citySearch').addEventListener('keydown',e=>{if(e.key==='Enter'){const first=$('suggestions').querySelector('button');if(first)first.click();else $('suggestions').classList.add('hidden')}});
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))$('suggestions').classList.add('hidden');if(!e.target.closest('.compare-city'))$('compareSuggestions').classList.add('hidden')});
$('compareSearch').addEventListener('input',e=>{clearTimeout(state.compareDebounce);state.compareDebounce=setTimeout(()=>searchCities(e.target.value,$('compareSuggestions')),250)});
async function loadComparison(city){
  $('compareSuggestions').classList.add('hidden');$('compareSearch').value=city.name;$('compareCityB')?.replaceChildren(document.createTextNode(city.name));
  $('compareDescB').textContent='Consultando condições…';$('compareTempB').textContent='…';
  try{const w=await api(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`);state.compare={city,w};$('compareDescB').textContent=weatherInfo(w.current.weather_code)[0];$('compareTempB').textContent=`${round(w.current.temperature_2m)}°`;$('compareMetaB').textContent=`Sensação ${round(w.current.apparent_temperature)}°`;}
  catch(e){$('compareDescB').textContent='Não foi possível carregar';toast('Falha ao comparar cidades.')}
}
function renderCompareA(){if(state.weather){const c=state.weather.current;$('compareTempA').textContent=`${round(c.temperature_2m)}°`;$('compareDescA').textContent=weatherInfo(c.weather_code)[0]}}
$('locateBtn').addEventListener('click',()=>{if(!navigator.geolocation){toast('Seu navegador não oferece geolocalização.');return}toast('Solicitando sua localização…');navigator.geolocation.getCurrentPosition(async pos=>{try{const data=await api(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&language=pt&format=json`);const c=data.results?.[0];loadCity({name:c?.name||'Minha localização',admin1:c?.admin1||'',country:c?.country||'',latitude:pos.coords.latitude,longitude:pos.coords.longitude,timezone:c?.timezone||'auto'})}catch(e){loadCity({name:'Minha localização',admin1:'',country:'',latitude:pos.coords.latitude,longitude:pos.coords.longitude,timezone:'auto'})}},()=>toast('Permita a localização no navegador para usar este recurso.'),{enableHighAccuracy:false,timeout:10000})});
$('themeToggle').addEventListener('click',()=>{const dark=document.body.dataset.theme!=='dark';document.body.dataset.theme=dark?'dark':'light';if(dark){document.body.dataset.time='night'}else{document.body.dataset.time='day'}});


// Radar mundial: cidades de referência distribuídas por diferentes regiões climáticas.
const worldCities = [
  {id:'manaus',name:'Manaus',region:'América do Sul · Brasil',lat:-3.119,lon:-60.021},
  {id:'cuiaba',name:'Cuiabá',region:'América do Sul · Brasil',lat:-15.601,lon:-56.097},
  {id:'phoenix',name:'Phoenix',region:'América do Norte · EUA',lat:33.448,lon:-112.074},
  {id:'mexico-city',name:'Cidade do México',region:'América do Norte · México',lat:19.432,lon:-99.133},
  {id:'madrid',name:'Madri',region:'Europa · Espanha',lat:40.416,lon:-3.704},
  {id:'cairo',name:'Cairo',region:'Norte da África · Egito',lat:30.044,lon:31.235},
  {id:'dubai',name:'Dubai',region:'Oriente Médio · EAU',lat:25.204,lon:55.270},
  {id:'delhi',name:'Nova Délhi',region:'Sul da Ásia · Índia',lat:28.613,lon:77.209},
  {id:'bangkok',name:'Bangkok',region:'Sudeste Asiático · Tailândia',lat:13.756,lon:100.502},
  {id:'jakarta',name:'Jacarta',region:'Sudeste Asiático · Indonésia',lat:-6.208,lon:106.845},
  {id:'nairobi',name:'Nairóbi',region:'África Oriental · Quênia',lat:-1.292,lon:36.821},
  {id:'sydney',name:'Sydney',region:'Oceania · Austrália',lat:-33.868,lon:151.209}
];
const worldState = { rows:[], sort:'hot', map:null, markers:new Map(), started:false };
const roniUrl = 'https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt';
const ensoBulletinUrl = 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml';
function anomalyLabel(value){if(!Number.isFinite(value))return 'Referência pendente';const sign=value>0?'+':'';return `Anomalia ${sign}${value.toFixed(1).replace('.',',')}°C`}
function anomalyColor(value){if(!Number.isFinite(value))return '#89999f';if(value>=2)return '#bd4d37';if(value>=1)return '#d86f4f';if(value>=0.3)return '#e4a06b';if(value<=-1)return '#4c8fae';if(value<=-0.3)return '#6ba9c0';return '#8caaa7'}
function initializeWorldMap(){
  const node=$('worldMap');if(!node)return;
  if(!window.L){node.innerHTML='<div class="map-fallback">O mapa interativo não carregou. A lista de cidades continua disponível abaixo.<br>Confira sua conexão para carregar os componentes do mapa.</div>';return;}
  try{
    worldState.map=L.map(node,{worldCopyJump:true,scrollWheelZoom:false}).setView([15,8],1.45);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:8,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'}).addTo(worldState.map);
    setTimeout(()=>worldState.map?.invalidateSize(),180);
  }catch(e){console.warn('Mapa indisponível:',e);node.innerHTML='<div class="map-fallback">Não foi possível iniciar o mapa. O ranking continua disponível.</div>';worldState.map=null;}
}
function updateWorldMarker(row){
  if(!worldState.map)return;
  const color=anomalyColor(row.anomaly),html=`<div class="map-popup-name">${escapeHtml(row.name)} · ${escapeHtml(row.region)}</div><div class="map-popup-temp">${Number.isFinite(row.temp)?`${round(row.temp)}°C`:'—'}</div><div class="map-popup-anomaly">${escapeHtml(anomalyLabel(row.anomaly))}</div>`;
  const existing=worldState.markers.get(row.id);
  if(existing){existing.setStyle({color,fillColor:color});existing.setPopupContent(html);}
  else{const marker=L.circleMarker([row.lat,row.lon],{radius:7,color,weight:2,fillColor:color,fillOpacity:.85}).addTo(worldState.map).bindPopup(html);worldState.markers.set(row.id,marker);}
}
function renderWorldRanking(){
  const rows=[...worldState.rows];
  rows.sort((a,b)=>worldState.sort==='anomaly'?(Number.isFinite(b.anomaly)?b.anomaly:-Infinity)-(Number.isFinite(a.anomaly)?a.anomaly:-Infinity):(Number.isFinite(b.temp)?b.temp:-Infinity)-(Number.isFinite(a.temp)?a.temp:-Infinity));
  $('rankingTitle').textContent=worldState.sort==='anomaly'?'Maiores desvios da referência':'Temperaturas mais altas';
  $('rankingCount').textContent=`${rows.filter(r=>Number.isFinite(r.temp)).length} de ${worldCities.length} cidades`;
  $('worldRanking').innerHTML=rows.map((r,i)=>`<button type="button" class="world-city-row" data-city-id="${r.id}" aria-label="Ver ${escapeHtml(r.name)} no mapa"><span class="world-rank">${String(i+1).padStart(2,'0')}</span><span class="world-city-main"><span class="world-city-name">${escapeHtml(r.name)}</span><span class="world-city-region">${escapeHtml(r.region)} · ${r.status==='error'?'dados indisponíveis':Number.isFinite(r.todayMax)?`máx. prevista ${round(r.todayMax)}°C`:'calculando referência'}</span></span><span class="world-city-metric"><span class="world-city-temp">${Number.isFinite(r.temp)?`${round(r.temp)}°`:'—'}</span><span class="world-city-anomaly ${r.anomaly>0?'positive':r.anomaly<0?'negative':''}">${escapeHtml(anomalyLabel(r.anomaly))}</span></span></button>`).join('');
  $('worldRanking').querySelectorAll('[data-city-id]').forEach(btn=>btn.addEventListener('click',()=>{const row=worldState.rows.find(r=>r.id===btn.dataset.cityId);if(!row||!worldState.map)return;worldState.map.setView([row.lat,row.lon],4,{animate:true});worldState.markers.get(row.id)?.openPopup();}));
  $('mapStatus').textContent=`${rows.filter(r=>Number.isFinite(r.temp)).length}/${worldCities.length} cidades com dados`;
}
async function fetchWorldCurrent(city){
  const w=await api(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max&forecast_days=1&timezone=auto`);
  const date=(w.current?.time||w.daily?.time?.[0]||'').slice(0,10),idx=Math.max(0,w.daily.time.indexOf(date));
  return {...city,temp:w.current.temperature_2m,todayMax:w.daily.temperature_2m_max[idx],date,month:date.slice(5,7),weatherCode:w.current.weather_code,timezone:w.timezone,status:'ok',anomaly:null,baseline:null};
}
function readNormalCache(key){try{const item=JSON.parse(localStorage.getItem(key)||'null');if(item&&Number.isFinite(item.value))return item.value;}catch{}return null;}
function writeNormalCache(key,value){try{localStorage.setItem(key,JSON.stringify({value,savedAt:Date.now()}));}catch{}}
async function fetchMonthlyNormal(row){
  const key=`ceu-normal-v1-${row.id}-${row.month}`;const cached=readNormalCache(key);if(Number.isFinite(cached))return cached;
  const hist=await api(`https://archive-api.open-meteo.com/v1/archive?latitude=${row.lat}&longitude=${row.lon}&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_max&timezone=auto`);
  const vals=(hist.daily?.time||[]).reduce((acc,date,i)=>{if(date.slice(5,7)===row.month&&Number.isFinite(hist.daily.temperature_2m_max?.[i]))acc.push(hist.daily.temperature_2m_max[i]);return acc;},[]);
  if(vals.length<100)throw new Error('A referência histórica não contém dados suficientes.');
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length;writeNormalCache(key,mean);return mean;
}
async function runPool(items,limit,worker){let next=0;const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;await worker(items[i],i);}});await Promise.all(workers)}
async function loadWorldExplorer(){
  if(worldState.started)return;worldState.started=true;initializeWorldMap();
  worldState.rows=worldCities.map(c=>({...c,temp:null,todayMax:null,anomaly:null,status:'loading'}));renderWorldRanking();
  await runPool(worldCities,4,async(city)=>{
    const row=worldState.rows.find(r=>r.id===city.id);
    try{Object.assign(row,await fetchWorldCurrent(city));updateWorldMarker(row);renderWorldRanking();}
    catch(e){row.status='error';row.error=true;console.warn(`Dados atuais indisponíveis para ${city.name}:`,e);renderWorldRanking();}
  });
  $('mapStatus').textContent='Calculando referências históricas…';
  await runPool(worldState.rows.filter(r=>r.status==='ok'),3,async(row)=>{
    try{row.baseline=await fetchMonthlyNormal(row);row.anomaly=row.todayMax-row.baseline;row.status='complete';updateWorldMarker(row);}
    catch(e){row.status='normal-error';console.warn(`Referência histórica indisponível para ${row.name}:`,e);}
    renderWorldRanking();
  });
  $('mapStatus').textContent='Dados atuais + referência histórica';
}
async function loadEnsoIndex(){
  try{
    const raw=await loadRoniText();
    const rows=raw.split(/\r?\n/).map(line=>{const m=line.trim().match(/^([A-Z]{3})\s+(\d{4})\s+(-?\d+(?:\.\d+)?)/);return m?{season:m[1],year:+m[2],value:+m[3]}:null;}).filter(Boolean);
    const latest=rows.at(-1);if(!latest)throw new Error('Não foi possível interpretar a série RONI.');
    const value=latest.value,phase=value>=0.5?'El Niño':value<=-0.5?'La Niña':'ENSO neutro';
    $('ensoPhase').textContent=`Índice recente compatível com ${phase}`;$('roniValue').textContent=`${value>0?'+':''}${value.toFixed(2).replace('.',',')}°C`;$('roniSeason').textContent=`Trimestre móvel ${latest.season} · ${latest.year}`;
    $('ensoSummary').textContent=value>=0.5?'O índice RONI está na faixa positiva associada ao El Niño. Consulte o boletim oficial para o estado de alerta e a previsão atualizada.':value<=-0.5?'O índice RONI está na faixa negativa associada à La Niña. Consulte o boletim oficial para o estado de alerta e a previsão atualizada.':'O índice RONI está dentro da faixa neutra. A avaliação oficial considera também a atmosfera e as previsões dos modelos.';
    $('ensoUpdated').textContent='Índice RONI da NOAA CPC · média móvel de três meses';
  }catch(e){$('ensoPhase').textContent='Índice NOAA indisponível neste momento';$('ensoSummary').textContent='A conexão direta com a série oficial falhou. Abra o boletim NOAA para consultar a classificação mais recente; o monitor de cidades continua funcionando.';$('roniValue').textContent='—';$('roniSeason').textContent='Consulte a fonte oficial';$('ensoUpdated').textContent='A leitura automática pode ser bloqueada pelo navegador ou pela origem da fonte.';console.warn('Não foi possível carregar o índice RONI:',e);}
}
async function apiText(url){const r=await fetch(url);if(!r.ok)throw new Error(`Falha HTTP ${r.status}`);return r.text();}
async function loadRoniText(){
  // Em deploy, as funções serverless evitam bloqueios CORS da fonte NOAA.
  for(const endpoint of ['/api/enso','/.netlify/functions/enso']){
    try{const r=await fetch(endpoint,{headers:{'Accept':'application/json'}});if(!r.ok)continue;const payload=await r.json();if(typeof payload.data==='string'&&payload.data.trim())return payload.data;}catch{}
  }
  // Fallback para desenvolvimento local: depende de a NOAA permitir CORS.
  return apiText(roniUrl);
}
$('sortHot').addEventListener('click',()=>{worldState.sort='hot';$('sortHot').classList.add('active');$('sortAnomaly').classList.remove('active');renderWorldRanking()});
$('sortAnomaly').addEventListener('click',()=>{worldState.sort='anomaly';$('sortAnomaly').classList.add('active');$('sortHot').classList.remove('active');renderWorldRanking()});

loadCity(state.city);
loadWorldExplorer();
loadEnsoIndex();
