// D-Day Veersema — Bestelkaart (M3 Lavender)
const MENU = {
    lunch: {
        adult: [
            { id:'lunch-standaard', name:'Standaard', desc:'Klein soepje, 2 boerenboterhammen met kroketje, mosterd en uitsmijter', price:15 },
            { id:'lunch-vega', name:'Vegetarisch', desc:'Vegetarische variant van het 12 uurtje', price:15 },
        ],
        kids: [
            { id:'lunch-pannenkoek', name:'Pannenkoek suiker-stroop', desc:'', price:10 },
            { id:'lunch-kidsmenu', name:'Kids burger / kipnuggets / knakworst', desc:'Geserveerd met frietje en een verrassing', price:10 },
        ]
    },
    hoofdgerecht: {
        adult: {
            salades: { title:'Salade Bowls', subtitle:'Ook mogelijk op ambachtelijk bruin brood', items:[
                { id:'blikse-salade', name:'Blikse salade', desc:'Gemengde salade met tomaat, komkommer, gekruide kip, mango, paprika en sesamnotenmix', price:14.50 },
                { id:'vega-salade', name:'Vega salade', desc:'Gemengde salade met tomaat, komkommer, gegrilde groente, hummus van zongedroogde tomaat, notenmix', price:14.50 },
                { id:'sate-kip', name:'Saté van kippendijen', desc:'Geserveerd met frietjes', price:19 },
            ]},
            burgers: { title:'Burgers', subtitle:'Geserveerd met frietjes — ook vegetarisch mogelijk', items:[
                { id:'classic-burger', name:'Classic', desc:'100% rundvlees, ijsbergsla, spek, cheddar kaas, augurk, gebakken ui en zachte truffelmayonaise', price:18, vegOption:true },
                { id:'chefs-burger', name:'Chefs burger', desc:'100% rundvlees gekruid op chefs recept, ijsbergsla, gebakken ei, spek, gebakken ui en bbq saus', price:19, vegOption:true },
            ]}
        },
        kids: [
            { id:'kids-pannenkoek', name:"Bram's pannenkoek", desc:'Met poedersuiker, stroop en een verrassing', price:8.75 },
            { id:'kids-burger', name:'Kidsburger', desc:'Rundvlees burger en ijsbergsla, frites en een verrassing', price:10 },
            { id:'kids-knakworst', name:'Ambachtelijke XL knakworst', desc:'Slagers knakworst 2st, frites en een verrassing', price:10 },
            { id:'kids-tosti', name:'Tosti ham/kaas of tosti kaas', desc:'', price:4 },
            { id:'kids-friet', name:'Blikje friet met mayonaise', desc:'', price:3.75 },
        ]
    },
    extras: [
        { id:'extra-salade', name:'Kleine basis groene salade', price:3.50 },
        { id:'extra-zoete-friet', name:'Zoete aardappelfriet', price:6 },
    ]
};
const ALL_ITEMS=[...MENU.lunch.adult,...MENU.lunch.kids,...MENU.hoofdgerecht.adult.salades.items,...MENU.hoofdgerecht.adult.burgers.items,...MENU.hoofdgerecht.kids,...MENU.extras];

let formState={familyName:'',persons:[]},currentStep=1,currentPersonIndex=0,personIdCounter=0,editingOrderIndex=-1,lastDeleted=null,deleteTimer=null;
let isLocked=false;

document.addEventListener('DOMContentLoaded',()=>{loadLockState();loadDeadline();renderOverview();renderRestaurant();updateNavCount()});

function toggleLock(){
    isLocked=!isLocked;
    localStorage.setItem('dday-locked',JSON.stringify(isLocked));
    updateLockUI();
    if(sb){sb.from('settings').upsert({key:'locked',value:isLocked}).catch(()=>{})}
}
function loadLockState(){
    try{isLocked=JSON.parse(localStorage.getItem('dday-locked')||'false')}catch(e){isLocked=false}
    updateLockUI();
    if(sb){sb.from('settings').select('value').eq('key','locked').single().then(({data})=>{if(data){isLocked=!!data.value;localStorage.setItem('dday-locked',JSON.stringify(isLocked));updateLockUI()}}).catch(()=>{})}
}
function updateLockUI(){
    const tog=document.getElementById('lock-toggle');
    const knob=document.getElementById('lock-knob');
    if(tog){tog.style.background=isLocked?'#6B3A6E':'#D4C8EF'}
    if(knob){knob.style.left=isLocked?'26px':'4px'}
    const fab=document.getElementById('fab-add');
    if(fab)fab.style.opacity=isLocked?'0.5':'1';
    updateDeadlineUI();
}
function saveDeadline(val){
    localStorage.setItem('dday-deadline',val);
    if(sb){sb.from('settings').upsert({key:'deadline',value:val}).catch(()=>{})}
    updateDeadlineUI();
}
function loadDeadline(){
    const local=localStorage.getItem('dday-deadline')||'';
    const input=document.getElementById('deadline-input');
    if(input&&local)input.value=local;
    if(sb){sb.from('settings').select('value').eq('key','deadline').single().then(({data})=>{
        if(data&&data.value){localStorage.setItem('dday-deadline',data.value);if(input)input.value=data.value;updateDeadlineUI()}
    }).catch(()=>{})}
    updateDeadlineUI();
}
function updateDeadlineUI(){
    const val=localStorage.getItem('dday-deadline');
    const el=document.getElementById('fab-deadline');
    if(!el)return;
    if(!val){el.style.display='none';return}
    // Parse as local date parts to avoid timezone issues
    const parts=val.split('-');
    const deadline=new Date(+parts[0],+parts[1]-1,+parts[2]);
    const now=new Date();now.setHours(0,0,0,0);
    const diff=Math.round((deadline-now)/(1000*60*60*24));
    // Auto-lock when deadline has passed
    if(diff<0){el.textContent='Deadline verlopen';el.style.display='';if(!isLocked){isLocked=true;localStorage.setItem('dday-locked','true');updateLockUI()}}
    else if(diff===0){el.textContent='Laatste dag!';el.style.display='';}
    else if(diff===1){el.textContent='Nog 1 dag';el.style.display='';}
    else{el.textContent=`Nog ${diff} dagen`;el.style.display='';}
}

// === TABS ===
function showTab(t){
    document.getElementById('view-aanmelden').classList.toggle('hidden',t!=='aanmelden');
    document.getElementById('view-overzicht').classList.toggle('hidden',t!=='overzicht');
    document.getElementById('view-info').classList.toggle('hidden',t!=='info');
    ['aanmelden','overzicht','info'].forEach(id=>{
        const btn=document.getElementById('tab-'+id);
        if(btn)btn.className='nav-btn'+(t===id?' active':'');
    });
    const fab=document.getElementById('fab-add');
    if(fab)fab.classList.toggle('hidden',t!=='aanmelden');
    renderOverview();renderRestaurant();updateNavCount();
}
function updateNavCount(){
    const el=document.getElementById('nav-count');
    if(el)el.textContent=getOrders().length;
}
function toggleInfo(){const c=document.getElementById('info-content'),ch=document.getElementById('info-chevron');c.classList.toggle('hidden');ch.style.transform=c.classList.contains('hidden')?'':'rotate(180deg)'}

// === AANMELDEN ===
function renderOverview(){
    const orders=getOrders(),c=document.getElementById('orders-container');
    const re=document.getElementById('restaurant-empty');
    if(!orders.length){c.innerHTML='';if(re)re.classList.remove('hidden');return}
    if(re)re.classList.add('hidden');
    c.innerHTML=orders.map((o,idx)=>`
        <div class="card order-card px-5 py-4 fade-in" onclick="editOrder(${idx})">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,#FFE8F7,#E8DEFF)">${micon('group',22,'#6B3A6E')}</div>
                    <div><h3 class="ts-title-md text-surf-on">${esc(o.familyName)}</h3><span class="ts-label-sm text-surf-onvar">${o.persons.length} ${o.persons.length===1?'persoon':'personen'}</span></div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <span class="ts-label-sm text-pur">Wijzig</span>
                    <button onclick="event.stopPropagation();deleteOrder(${idx})" class="text-surf-onvar/30 hover:text-red-500 p-3 -mr-3 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        </div>`).join('');
}

// === RESTAURANT ===
function renderRestaurant(){
    const orders=getOrders();
    document.getElementById('restaurant-empty').classList.toggle('hidden',orders.length>0);
    document.getElementById('summary-section').classList.toggle('hidden',!orders.length);
    if(!orders.length)return;
    const allP=orders.flatMap(o=>o.persons),dc={};
    allP.forEach(p=>{if(p.hoofdgerecht){let n=getItemName(p.hoofdgerecht);if(p.vegetarisch)n+=' (vega)';if(p.opBrood)n+=' (op brood)';dc[n]=(dc[n]||0)+1}p.extras.forEach(e=>{const n=getItemName(e);dc[n]=(dc[n]||0)+1})});
    const row=(n,c)=>`<div class="flex justify-between items-center py-3 px-4 rounded-2xl bg-white mb-2"><span class="ts-body-md text-surf-on">${esc(n)}</span><span class="inline-flex items-center justify-center min-w-[32px] h-7 px-3 rounded-full bg-pur text-white ts-label-md font-medium">${c}x</span></div>`;
    const eD=Object.entries(dc).filter(([n])=>ALL_ITEMS.filter(i=>i.id.startsWith('extra-')).some(i=>i.name===n)).sort((a,b)=>b[1]-a[1]);
    const skipNames=ALL_ITEMS.filter(i=>i.id.startsWith('extra-')).map(i=>i.name);
    const hD=Object.entries(dc).filter(([n])=>!skipNames.includes(n.replace(' (vega)','').replace(' (op brood)',''))).sort((a,b)=>b[1]-a[1]);
    const opm=orders.flatMap(o=>o.persons.filter(p=>p.opmerkingen).map(p=>({naam:p.name,tekst:p.opmerkingen})));
    document.getElementById('summary-content').innerHTML=`
        ${hD.length?`<div class="mb-6"><h4 class="section-header mb-2.5 px-1 flex items-center gap-1.5">${micon('restaurant',16,'#8B5A8E')} Hoofdgerecht</h4><div class="space-y-0.5">${hD.map(([n,c])=>row(n,c)).join('')}</div></div>`:''}
        ${eD.length?`<div class="mb-6"><h4 class="section-header mb-2.5 px-1 flex items-center gap-1.5">${micon('add_circle',16,'#8B5A8E')} Extra's</h4><div class="space-y-0.5">${eD.map(([n,c])=>row(n,c)).join('')}</div></div>`:''}
        ${opm.length?`<div class="pt-5 border-t border-lav-200/40"><h4 class="section-header mb-3 px-1 flex items-center gap-1.5">${micon('edit_note',16,'#8B5A8E')} Dieetwensen</h4><div class="space-y-2">${opm.map(o=>`<div class="flex gap-2 py-2 px-3.5 bg-lav-50 rounded-xl"><span class="ts-label-lg text-surf-on shrink-0">${esc(o.naam)}:</span><span class="ts-body-md text-surf-onvar">${esc(o.tekst)}</span></div>`).join('')}</div></div>`:''}`;

    // Gasten totaal op overzicht tab
    const oc=document.getElementById('overzicht-content');
    if(oc)oc.innerHTML=orders.length?`<div class="stat-card flex items-center gap-5 mb-5 py-5 px-6">
        <div class="text-4xl font-extrabold text-pur tracking-tight">${allP.length}</div>
        <div><div class="ts-title-md text-lav-900">Gasten</div><div class="ts-body-sm text-surf-onvar mt-0.5">${allP.filter(p=>!p.isKind).length} volwassenen · ${allP.filter(p=>p.isKind).length} kinderen</div><div class="ts-label-sm text-surf-onvar/50 mt-1">${orders.length} gezinnen</div></div>
    </div>`:'';
}

// === FORM ===
function startNewOrder(){if(isLocked){showToast('Het menu is ingediend, wijzigen is niet meer mogelijk','lock');return}editingOrderIndex=-1;formState={familyName:'',persons:[]};personIdCounter=0;openForm()}
function editOrder(i){if(isLocked){showToast('Bestellingen zijn vergrendeld','lock');return}const o=getOrders()[i];editingOrderIndex=i;formState={familyName:o.familyName,persons:o.persons.map((p,j)=>({...p,id:j+1}))};personIdCounter=formState.persons.length;openForm()}
function openForm(){document.getElementById('app-header').classList.add('hidden');document.getElementById('header-fade').classList.add('hidden');document.getElementById('content-area').classList.add('hidden');document.getElementById('fab-add').classList.add('hidden');document.getElementById('view-form').classList.remove('hidden');currentStep=1;currentPersonIndex=0;showStep(1);document.getElementById('family-name').value=formState.familyName;renderMembersList();updateStep1UI();window.scrollTo({top:0,behavior:'smooth'})}
function cancelForm(){if(formState.persons.length||formState.familyName){if(!confirm('Weet je zeker? Je wijzigingen gaan verloren.'))return}closeForm()}
function closeForm(){document.getElementById('view-form').classList.add('hidden');document.getElementById('app-header').classList.remove('hidden');document.getElementById('header-fade').classList.remove('hidden');document.getElementById('content-area').classList.remove('hidden');document.getElementById('fab-add').classList.remove('hidden');showTab('aanmelden');window.scrollTo({top:0,behavior:'smooth'})}

// === STAP 1 ===
function addMember(){const ni=document.getElementById('new-member-name'),ts=document.getElementById('new-member-type'),nm=ni.value.trim();if(!nm){showToast('Vul eerst een naam in','touch_app');ni.focus();return}formState.persons.push({id:++personIdCounter,name:nm,isKind:ts.value==='kind',isBaby:ts.value==='baby',lunch:'',hoofdgerecht:'',vegetarisch:false,opBrood:false,extras:[],opmerkingen:''});ni.value='';ni.focus();ts.value='adult';renderMembersList();updateStep1UI()}
function removeMember(id){const p=formState.persons.find(x=>x.id===id);if(!confirm(`${p?p.name:'Deze persoon'} verwijderen?`))return;formState.persons=formState.persons.filter(p=>p.id!==id);renderMembersList();updateStep1UI()}
function renderMembersList(){
    const l=document.getElementById('members-list');
    if(!formState.persons.length){l.innerHTML='<p class="ts-body-sm text-surf-onvar/50 italic py-2">Voeg hieronder de eerste eter toe</p>';return}
    l.innerHTML=formState.persons.map(p=>{
        const icon=p.isBaby?micon('child_friendly',18,'#A98ADB'):p.isKind?micon('child_care',18,'#8B5A8E'):micon('person',18,'#6B3A6E');
        const bg=p.isBaby?'bg-lav-50':p.isKind?'bg-lav-100':'bg-rose-100';
        const border=p.isBaby?'border-l-lav-300':p.isKind?'border-l-lav-400':'border-l-rose-300';
        const label=p.isBaby?'Baby':p.isKind?'Kind':'Volwassene';
        return`<div class="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-white border-l-[3px] ${border} fade-in">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${bg}">${icon}</div>
            <div class="flex-1"><span class="ts-title-sm text-surf-on">${esc(p.name)}</span> <span class="ts-label-sm text-surf-onvar ml-1">${label}</span></div>
            <button onclick="removeMember(${p.id})" class="p-3 text-surf-onvar/30 hover:text-red-500 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>`}).join('');
}
function updateStep1UI(){document.getElementById('btn-to-step2').disabled=!(document.getElementById('family-name').value.trim()&&formState.persons.length)}

// === STAP 2 ===
function renderPersonTabs(){
    document.getElementById('person-tabs').innerHTML=formState.persons.map((p,i)=>{const a=i===currentPersonIndex,d=p.isBaby||p.lunch||p.hoofdgerecht;const icon=p.isBaby?'child_friendly':p.isKind?'child_care':'person';return`<button onclick="selectPerson(${i})" class="shrink-0 px-4 py-2 rounded-full ts-label-md transition-all whitespace-nowrap ${a?'bg-pur text-white shadow-sm':d?'bg-rose-100 text-pur':'bg-lav-100 text-surf-onvar'}"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle">${icon}</span> ${esc(p.name)}${d?' <span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle">check</span>':''}</button>`}).join('');
    setTimeout(()=>{const t=document.getElementById('person-tabs');if(t.children[currentPersonIndex])t.children[currentPersonIndex].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})},50);
    document.getElementById('person-counter').textContent=`${formState.familyName} — ${currentPersonIndex+1} van ${formState.persons.length}`;
}
function selectPerson(i){savePersonFromDOM();currentPersonIndex=i;renderPersonTabs();renderPersonMenu();updatePersonNav();document.getElementById('person-menu-container').scrollIntoView({behavior:'smooth',block:'start'})}
function renderPersonMenu(){
    const p=formState.persons[currentPersonIndex];if(!p)return;
    if(p.isBaby){document.getElementById('person-menu-container').innerHTML=`<div class="card p-6 text-center fade-in"><div class="w-16 h-16 mx-auto mb-4 rounded-full bg-lav-50 flex items-center justify-center">${micon('child_friendly',32,'#A98ADB')}</div><p class="ts-title-md text-surf-on mb-1">${esc(p.name)}</p><p class="ts-body-sm text-surf-onvar">Eet niet mee — geen menukeuze nodig</p></div>`;return}
    const k=p.isKind;
    document.getElementById('person-menu-container').innerHTML=`
        <div class="person-card ${k?'kind':''} p-5 fade-in">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg ${k?'bg-lav-100':'bg-rose-100'}">${k?micon('child_care',24,'#8B5A8E'):micon('person',24,'#6B3A6E')}</div>
                <div><h3 class="ts-title-lg text-surf-on">${esc(p.name)}</h3><span class="ts-label-sm px-2.5 py-0.5 rounded-full ${k?'bg-lav-100 text-lav-700':'bg-rose-100 text-rose-500'}">${k?'Kind':'Volwassene'}</span></div>
            </div>
            <section class="mb-7"><h4 class="section-header mb-3 flex items-center gap-1.5">${micon('restaurant',16,'#8B5A8E')} Wat wil je eten?</h4>${k?kidsHTML(p):adultHTML(p)}</section>
            <section class="mb-7"><h4 class="section-header mb-3 flex items-center gap-1.5">${micon('add_circle',16,'#8B5A8E')} Extra's</h4><div class="space-y-2">${MENU.extras.map(i=>checkCard(i,p.extras.includes(i.id))).join('')}</div></section>
            <section><h4 class="section-header mb-3 flex items-center gap-1.5">${micon('edit_note',16,'#8B5A8E')} Dieetwensen / Opmerkingen</h4><textarea id="opmerkingen" rows="2" placeholder="bijv. glutenvrij, noten-allergie, extra mayo..." class="w-full px-4 py-3 border-2 border-lav-200 focus:border-pur focus:outline-none ts-body-md bg-white resize-none rounded-xl">${esc(p.opmerkingen)}</textarea></section>
        </div>`;
}
function radioCard(g,item,chk){return`<div class="radio-card"><input type="radio" name="${g}" id="${g}-${item.id}" value="${item.id}" ${chk?'checked':''} class="hidden"${g==='hoofd'?` onchange="onHoofdChange('${item.id}')"`:''}><label for="${g}-${item.id}" class="flex items-start gap-3.5 p-4 cursor-pointer"><div class="dot w-5 h-5 rounded-full border-2 border-lav-300 mt-0.5 shrink-0 transition-all"></div><div class="flex-1 min-w-0"><div class="ts-title-sm text-surf-on">${esc(item.name)}</div>${item.desc?`<div class="ts-body-sm text-surf-onvar mt-1">${esc(item.desc)}</div>`:''}</div></label></div>`}
function checkCard(item,chk){return`<div class="check-card"><input type="checkbox" id="extra-${item.id}" value="${item.id}" ${chk?'checked':''} class="hidden"><label for="extra-${item.id}" class="flex items-center gap-3.5 p-4 cursor-pointer"><div class="check-box w-5 h-5 rounded-md border-2 border-lav-300 shrink-0 flex items-center justify-center transition-all"><svg class="w-3 h-3 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div><span class="ts-title-sm text-surf-on">${esc(item.name)}</span></label></div>`}
function adultHTML(p){
    const s=MENU.hoofdgerecht.adult.salades,b=MENU.hoofdgerecht.adult.burgers;
    return`<div class="space-y-5">
        <div><div class="ts-label-md text-surf-onvar mb-2.5">${s.title} <span class="font-normal text-surf-onvar/50">— ${s.subtitle}</span></div><div class="space-y-2">${s.items.map(i=>hoofdRadio(i,p)).join('')}</div></div>
        <div><div class="ts-label-md text-surf-onvar mb-2.5">${b.title} <span class="font-normal text-surf-onvar/50">— ${b.subtitle}</span></div><div class="space-y-2">${b.items.map(i=>hoofdRadio(i,p)).join('')}</div></div>
        <div id="salade-opties" class="${['blikse-salade','vega-salade'].includes(p.hoofdgerecht)?'':'hidden'}"><label class="inline-flex items-center gap-2 cursor-pointer px-1"><input type="checkbox" id="opBrood" ${p.opBrood?'checked':''} class="w-4 h-4 rounded border-lav-300 accent-pur"><span class="ts-body-md text-pur">${micon('bakery_dining',16,'#6B3A6E')} Op ambachtelijk bruin brood</span></label></div>
    </div>`}
function hoofdRadio(item,p){return`<div class="radio-card"><input type="radio" name="hoofd" id="hoofd-${item.id}" value="${item.id}" ${p.hoofdgerecht===item.id?'checked':''} onchange="onHoofdChange('${item.id}')" class="hidden"><label for="hoofd-${item.id}" class="flex items-start gap-3.5 p-4 cursor-pointer"><div class="dot w-5 h-5 rounded-full border-2 border-lav-300 mt-0.5 shrink-0 transition-all"></div><div class="flex-1 min-w-0"><div class="ts-title-sm text-surf-on">${esc(item.name)}</div>${item.desc?`<div class="ts-body-sm text-surf-onvar mt-1">${esc(item.desc)}</div>`:''}${item.vegOption?`<label class="inline-flex items-center gap-2 mt-3 py-2 px-3 rounded-xl cursor-pointer bg-lav-50/50" onclick="event.stopPropagation()"><input type="checkbox" id="veg-${item.id}" ${p.vegetarisch&&p.hoofdgerecht===item.id?'checked':''} class="w-4 h-4 rounded border-lav-300 accent-pur"><span class="ts-body-md text-lav-600">${micon('eco',16,'#A98ADB')} Vegetarisch (spek → gegrilde groente)</span></label>`:''}</div></label></div>`}
function kidsHTML(p){return`<div class="space-y-2">${MENU.hoofdgerecht.kids.map(i=>radioCard('hoofd',i,p.hoofdgerecht===i.id)).join('')}</div>`}
function onHoofdChange(id){const el=document.getElementById('salade-opties');if(el)el.classList.toggle('hidden',!['blikse-salade','vega-salade'].includes(id))}
function savePersonFromDOM(){const p=formState.persons[currentPersonIndex];if(!p)return;const l=document.querySelector('input[name="lunch"]:checked');if(l)p.lunch=l.value;const h=document.querySelector('input[name="hoofd"]:checked');if(h)p.hoofdgerecht=h.value;const v=document.getElementById(`veg-${p.hoofdgerecht}`);p.vegetarisch=v?v.checked:false;const b=document.getElementById('opBrood');p.opBrood=b?b.checked:false;p.extras=MENU.extras.filter(e=>{const el=document.getElementById(`extra-${e.id}`);return el&&el.checked}).map(e=>e.id);const o=document.getElementById('opmerkingen');if(o)p.opmerkingen=o.value}
function updatePersonNav(){document.getElementById('btn-prev-person').classList.toggle('invisible',currentPersonIndex===0);document.getElementById('btn-next-label').textContent=currentPersonIndex===formState.persons.length-1?'Alles nakijken →':'Volgende →'}
function prevPerson(){if(currentPersonIndex>0)selectPerson(currentPersonIndex-1)}
function nextPersonOrFinish(){savePersonFromDOM();if(currentPersonIndex<formState.persons.length-1)selectPerson(currentPersonIndex+1);else goToStep(3)}

// === STAP 3 ===
function renderReview(){
    document.getElementById('review-content').innerHTML=`<div class="ts-label-lg text-pur mb-4">${esc(formState.familyName)}</div>`+formState.persons.map((p,i)=>{
        const items=[];if(p.hoofdgerecht){let h=esc(getItemName(p.hoofdgerecht));if(p.vegetarisch)h+=' <span class="text-lav-600">(vega)</span>';if(p.opBrood)h+=' <span class="text-pur">(op brood)</span>';items.push(`<span class="text-surf-onvar">Hoofd:</span> ${h}`)}p.extras.forEach(e=>items.push(`<span class="text-surf-onvar">Extra:</span> ${esc(getItemName(e))}`));
        return`<button onclick="goToStep(2,${i})" class="block w-full text-left py-3.5 ${i?'border-t border-lav-200/40':''} hover:bg-rose-50 -mx-2 px-2 rounded-xl transition-colors">
            <div class="flex items-center gap-2 mb-1.5"><span class="ts-title-sm text-surf-on">${esc(p.name)}</span><span class="ts-label-sm px-2 py-0.5 rounded-full ${p.isBaby?'bg-lav-50 text-lav-500':p.isKind?'bg-lav-100 text-lav-700':'bg-rose-100 text-rose-500'}">${p.isBaby?'Baby':p.isKind?'Kind':'Volw.'}</span><span class="ml-auto ts-label-sm text-pur">wijzig →</span></div>
            <div class="ts-body-sm space-y-0.5 text-surf-on">${p.isBaby?`<div class="text-surf-onvar">Eet niet mee</div>`:items.length?items.map(i=>`<div>${i}</div>`).join(''):`<div class="text-red-500 font-medium bg-red-50 px-3 py-2 rounded-xl ts-body-sm flex items-center gap-1">${micon('warning',16,'#ef4444')} Nog niks gekozen</div>`}${p.opmerkingen?`<div class="ts-label-sm text-lav-500 mt-1.5 flex items-center gap-1">${micon('edit_note',14,'#A98ADB')} ${esc(p.opmerkingen)}</div>`:''}</div>
        </button>`}).join('');
}
function saveOrder(){
    savePersonFromDOM();const inc=formState.persons.filter(p=>!p.isBaby&&!p.hoofdgerecht);
    if(inc.length){const nm=inc.map(p=>p.name).join(', ');if(!confirm(`${nm} ${inc.length===1?'heeft':'hebben'} nog niks gekozen.\n\nToch opslaan?`))return}
    const data={familyName:formState.familyName,persons:formState.persons.map(p=>({name:p.name,isKind:p.isKind,lunch:p.lunch,hoofdgerecht:p.hoofdgerecht,vegetarisch:p.vegetarisch,opBrood:p.opBrood,extras:[...p.extras],opmerkingen:p.opmerkingen})),timestamp:new Date().toISOString()};
    const orders=getOrders();if(editingOrderIndex>=0)orders[editingOrderIndex]=data;else orders.push(data);saveOrders(orders);
    document.getElementById('view-form').classList.add('hidden');document.getElementById('app-header').classList.remove('hidden');document.getElementById('header-fade').classList.remove('hidden');document.getElementById('content-area').classList.remove('hidden');document.getElementById('fab-add').classList.remove('hidden');showTab('aanmelden');renderOverview();renderRestaurant();showToast('Top! Bestelling staat erin','check_circle');window.scrollTo({top:0,behavior:'smooth'});
}

// === STEPS ===
function goToStep(step,personIdx){
    if(currentStep===1)formState.familyName=document.getElementById('family-name').value.trim();
    if(currentStep===2)savePersonFromDOM();
    if(step===2&&(!formState.familyName||!formState.persons.length)){showToast('Vul een naam in en voeg iemand toe','touch_app');return}
    currentStep=step;showStep(step);
    if(step===2){if(typeof personIdx==='number')currentPersonIndex=personIdx;renderPersonTabs();renderPersonMenu();updatePersonNav()}
    if(step===3)renderReview();
    window.scrollTo({top:0,behavior:'smooth'});
}
function showStep(s){
    [1,2,3].forEach(i=>document.getElementById(`step-${i}`).classList.toggle('hidden',i!==s));
    for(let i=1;i<=3;i++){const d=document.getElementById(`step-dot-${i}`);d.className=`step-dot ${i<s?'done':i===s?'active':'upcoming'}`;if(i<s){d.innerHTML='<span class="material-symbols-rounded" style="font-size:16px;color:white">check</span>'}else{d.textContent=i};const l=document.getElementById(`step-label-${i}`);l.style.color=i===s?'#6B3A6E':i<s?'#8B5A8E':'';l.style.fontWeight=i<=s?'600':'';if(i<3)document.getElementById(`step-line-${i}`).className=`step-line ${i<s?'done':'upcoming'}`}
}

// === DATA (Supabase realtime + localStorage fallback) ===
// Supabase tabel: "orders" met kolommen: id (int8, auto), family_name (text), data (jsonb), updated_at (timestamptz)

let _ordersCache = null;

function getOrders() {
    if (_ordersCache !== null) return _ordersCache;
    try { return JSON.parse(localStorage.getItem('dday-orders')) || []; } catch(e) { return []; }
}

async function saveOrders(orders) {
    localStorage.setItem('dday-orders', JSON.stringify(orders));
    _ordersCache = orders;
    if (!sb) return;
    _justSaved=true;
    try {
        // Delete then insert sequentially — await each step
        const {error:delErr} = await sb.from('orders').delete().neq('id', 0);
        if(delErr) throw delErr;
        if (orders.length) {
            const rows = orders.map(o => ({ family_name: o.familyName, data: o }));
            const {error:insErr} = await sb.from('orders').insert(rows);
            if(insErr) throw insErr;
        }
    } catch(e) { console.error('[Supabase] Schrijven mislukt:', e); showToast('Opslaan mislukt, probeer opnieuw','error'); }
}

async function _loadFromSupabase() {
    if (!sb) return;
    try {
        const { data, error } = await sb.from('orders').select('data').order('id');
        if (error) throw error;
        const orders = (data || []).map(r => r.data);
        localStorage.setItem('dday-orders', JSON.stringify(orders));
        _ordersCache = orders;
        renderOverview();
        renderRestaurant();
        updateNavCount();
    } catch(e) { console.error('[Supabase] Laden mislukt:', e); }
}

let _syncTimer=null;
let _justSaved=false;
function _debouncedLoad(){
    if(_justSaved){_justSaved=false;return}
    clearTimeout(_syncTimer);
    _syncTimer=setTimeout(()=>_loadFromSupabase(),500);
}
function _initSupabaseRealtime() {
    if (!sb) return;
    sb.channel('orders-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            _debouncedLoad();
        })
        .subscribe();
    _loadFromSupabase();
}

document.addEventListener('DOMContentLoaded', () => { _initSupabaseRealtime(); });
function deleteOrder(idx){const orders=getOrders();lastDeleted={order:orders[idx],index:idx};orders.splice(idx,1);saveOrders(orders);renderOverview();renderRestaurant();clearTimeout(deleteTimer);const t=document.getElementById('toast');t.innerHTML=`${micon('delete',18,'#ffffff')}&nbsp;Verwijderd <button onclick="undoDelete()" style="margin-left:12px;text-decoration:underline;font-weight:600">Ongedaan maken</button>`;t.classList.remove('opacity-0','translate-y-4');t.classList.add('opacity-100','translate-y-0');t.style.pointerEvents='auto';deleteTimer=setTimeout(()=>{lastDeleted=null;t.classList.add('opacity-0','translate-y-4');t.classList.remove('opacity-100','translate-y-0');t.style.pointerEvents='none'},5000)}
function undoDelete(){if(!lastDeleted)return;clearTimeout(deleteTimer);const orders=getOrders();orders.splice(lastDeleted.index,0,lastDeleted.order);saveOrders(orders);lastDeleted=null;renderOverview();renderRestaurant();showToast('Hersteld!','undo')}

// === EXCEL ===
function downloadExcel(){
    const orders=getOrders();if(!orders.length)return;const wb=XLSX.utils.book_new();
    const rows=[];orders.forEach(o=>o.persons.forEach(p=>{let h=p.hoofdgerecht?getItemName(p.hoofdgerecht):'';if(p.vegetarisch)h+=' (veg)';if(p.opBrood)h+=' (op brood)';rows.push({'Naam':o.familyName,'Persoon':p.name,'Volw./Kind':p.isBaby?'Baby':p.isKind?'Kind':'Volwassene','Hoofdgerecht':h,"Extra's":p.extras.map(e=>getItemName(e)).join(', '),'Dieetwensen':p.opmerkingen||''})}));
    const ws1=XLSX.utils.json_to_sheet(rows);ws1['!cols']=[{wch:20},{wch:18},{wch:12},{wch:28},{wch:30},{wch:30},{wch:30}];XLSX.utils.book_append_sheet(wb,ws1,'Bestellingen');
    const allP=orders.flatMap(o=>o.persons);const dc={};allP.forEach(p=>{if(p.lunch){const n=getItemName(p.lunch);dc[n]=(dc[n]||0)+1}if(p.hoofdgerecht){let n=getItemName(p.hoofdgerecht);if(p.vegetarisch)n+=' (veg)';dc[n]=(dc[n]||0)+1}p.extras.forEach(e=>{const n=getItemName(e);dc[n]=(dc[n]||0)+1})});
    const sr=Object.entries(dc).sort((a,b)=>b[1]-a[1]).map(([n,c])=>({'Gerecht':n,'Aantal':c}));sr.push({});sr.push({'Gerecht':'Totaal','Aantal':allP.length});sr.push({'Gerecht':'Volwassenen','Aantal':allP.filter(p=>!p.isKind).length});sr.push({'Gerecht':'Kinderen','Aantal':allP.filter(p=>p.isKind).length});
    const ws2=XLSX.utils.json_to_sheet(sr);ws2['!cols']=[{wch:35},{wch:12}];XLSX.utils.book_append_sheet(wb,ws2,'Samenvatting');
    XLSX.writeFile(wb,`D-Day_Veersema_${new Date().toISOString().slice(0,10)}.xlsx`);showToast('Excel gedownload!','download');
}

// === HELPERS ===
function getItemName(id){const i=ALL_ITEMS.find(x=>x.id===id);return i?i.name:id}
function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function micon(name,size=20,color='#6B3A6E'){return`<span class="material-symbols-rounded" style="font-size:${size}px;color:${color};vertical-align:middle">${name}</span>`}
function showToast(msg,iconName=''){const t=document.getElementById('toast');t.innerHTML=iconName?`${micon(iconName,18,'#ffffff')}&nbsp;&nbsp;${esc(msg)}`:esc(msg);t.classList.remove('opacity-0','translate-y-4');t.classList.add('opacity-100','translate-y-0');t.style.pointerEvents='none';setTimeout(()=>{t.classList.add('opacity-0','translate-y-4');t.classList.remove('opacity-100','translate-y-0')},2500)}
