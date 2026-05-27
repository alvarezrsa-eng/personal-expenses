import { useState, useEffect, useMemo } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { runSeedIfNeeded } from "./seed";

const ALLOWED_EMAIL = "alvarezrsa@gmail.com";
const provider = new GoogleAuthProvider();

const PAYMENT_METHODS = ["Littio (USD→COP)", "Bancolombia (COP)", "Visa", "Sistecredito", "Tuya"];
const CATEGORIES = ["Hogar","Familia","Salud","Movilidad","Extras","Alimentacion","Suscripciones","Deudas","Cuidado Personal","Bienestar","Work","Educacion","Mascotas","Sin categoría"];

const DEFAULT_EXPENSES = [
  {name:"Somos Internet",category:"Hogar"},{name:"Arriendo",category:"Hogar"},
  {name:"Colegio",category:"Familia"},{name:"Prepagada Sura",category:"Familia"},
  {name:"Movistar Sofia",category:"Familia"},{name:"Movistar Santi",category:"Familia"},
  {name:"Transporte colegio Santi",category:"Movilidad"},{name:"Limpieza Dental - Santi",category:"Salud"},
  {name:"Lina Gomez",category:"Extras"},{name:"Zarina",category:"Extras"},
  {name:"Obligaciones Sofia",category:"Extras"},{name:"Deportologo Santi",category:"Salud"},
  {name:"Boxeo",category:"Salud"},{name:"Willy PF Santi",category:"Cuidado Personal"},
  {name:"Runmaker Sofia",category:"Cuidado Personal"},{name:"SmartFit",category:"Cuidado Personal"},
  {name:"Sra Yolanda (1ra quincena)",category:"Hogar"},{name:"Sra Yolanda (2da quincena)",category:"Hogar"},
  {name:"Peluqueria Santi",category:"Familia"},{name:"Zapatos de correr",category:"Cuidado Personal"},
  {name:"Cafe cami",category:"Alimentacion"},{name:"Johana",category:"Deudas"},
  {name:"Queso",category:"Alimentacion"},{name:"Catalina",category:"Extras"},
  {name:"Emi",category:"Salud"},{name:"HBO / Netflix / Disney",category:"Suscripciones"},
  {name:"EPM",category:"Hogar"},{name:"Tuya",category:"Deudas"},
  {name:"Sistecredito",category:"Deudas"},{name:"Cafe Gulungo",category:"Alimentacion"},
  {name:"Claro",category:"Hogar"},{name:"Santi (suscripciones)",category:"Suscripciones"},
  {name:"Oz",category:"Salud"},{name:"Cafe Viernes",category:"Alimentacion"},
  {name:"Psicologo Santi - Cita Mama",category:"Salud"},{name:"Psicologo Santi - Cita Santi 1",category:"Salud"},
  {name:"Psicologo Santi - Cita Santi 2",category:"Salud"},{name:"Mis flores",category:"Extras"},
  {name:"Google Plus",category:"Extras"},{name:"Inscripcion Canada Santi",category:"Familia"},
  {name:"Diana Psiquiatra - Sofia",category:"Salud"},{name:"Cata Ramirez",category:"Deudas"},
  {name:"Indira",category:"Deudas"},{name:"Cata e Indira",category:"Deudas"},
  {name:"Tuya Exito",category:"Deudas"},{name:"Cata",category:"Bienestar"},
  {name:"Psicologo Santi",category:"Salud"},{name:"Psiquiatra Santi",category:"Salud"},
  {name:"Dermatologo Santi",category:"Salud"},{name:"Pedro",category:"Deudas"},
  {name:"Quesera",category:"Alimentacion"},{name:"Dgo",category:"Suscripciones"},
  {name:"Medicamentos Ansiedad",category:"Salud"},{name:"Pizza",category:"Alimentacion"},
  {name:"Audifonos",category:"Cuidado Personal"},{name:"Verduras",category:"Alimentacion"},
  {name:"Audio Setup",category:"Work"},{name:"Carne",category:"Alimentacion"},
  {name:"Curso IA Santiago",category:"Educacion"},{name:"Antivirus",category:"Work"},
  {name:"Baño perritas",category:"Mascotas"},{name:"Medicinas",category:"Salud"},
  {name:"Movistar",category:"Familia"},{name:"Santi expenses",category:"Familia"},
];

const CAT_COLORS = {
  Hogar:"#378ADD",Familia:"#1D9E75",Salud:"#D85A30",Movilidad:"#888780",
  Extras:"#D4537E",Alimentacion:"#EF9F27",Suscripciones:"#7F77DD",Deudas:"#E24B4A",
  "Cuidado Personal":"#5DCAA5",Bienestar:"#F0997B",Work:"#639922",Educacion:"#185FA5",
  Mascotas:"#BA7517","Sin categoría":"#B4B2A9"
};
const PM_COLORS = {
  "Littio (USD→COP)":"#1D9E75","Bancolombia (COP)":"#378ADD",
  "Visa":"#7F77DD","Sistecredito":"#D85A30","Tuya":"#EF9F27"
};

const fmt = (n) => (n??0).toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtUSD = (n) => (n??0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

const fsGet = async (key) => {
  try {
    const snap = await getDoc(doc(db, "expenses_app", key));
    return snap.exists() ? snap.data().value : null;
  } catch { return null; }
};
const fsSet = async (key, value) => {
  try { await setDoc(doc(db, "expenses_app", key), { value }); } catch(e){ console.error(e); }
};

function Modal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"white",borderRadius:12,border:"1px solid #e5e7eb",padding:"1.5rem",width:500,maxWidth:"95vw",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:500}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#6b7280"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, error }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f9fafb",fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:16,border:"1px solid #e5e7eb",padding:"2.5rem 2rem",width:340,textAlign:"center",boxShadow:"0 4px 24px rgba(0,0,0,0.07)"}}>
        <div style={{fontSize:36,marginBottom:8}}>💸</div>
        <h1 style={{fontSize:22,fontWeight:600,margin:"0 0 4px"}}>Sofia Gastos</h1>
        <p style={{fontSize:13,color:"#6b7280",margin:"0 0 28px"}}>Tu app personal de gastos</p>
        <button onClick={onLogin} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"11px 16px",border:"1px solid #e5e7eb",borderRadius:10,background:"white",cursor:"pointer",fontSize:14,fontWeight:500,color:"#111"}}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continuar con Google
        </button>
        {error && <p style={{marginTop:16,fontSize:12,color:"#dc2626"}}>{error}</p>}
        <p style={{marginTop:20,fontSize:11,color:"#d1d5db"}}>Solo acceso autorizado</p>
      </div>
    </div>
  );
}

export default function App(){
  const [user, setUser] = useState(undefined);
  const [authError, setAuthError] = useState("");
  const [records, setRecords] = useState([]);
  const [expenseDefs, setExpenseDefs] = useState(DEFAULT_EXPENSES);
  const [income, setIncome] = useState([]);
  const [rate, setRate] = useState(3630);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filterMonth, setFilterMonth] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterPM, setFilterPM] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{
      if(u && u.email === ALLOWED_EMAIL){ setUser(u); setAuthError(""); }
      else if(u){ signOut(auth); setUser(null); setAuthError("Acceso no autorizado para "+u.email); }
      else { setUser(null); }
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(!user) return;
    (async()=>{
      await runSeedIfNeeded();
      const r = await fsGet("records"); if(r) setRecords(JSON.parse(r));
      const d = await fsGet("defs"); if(d) setExpenseDefs(JSON.parse(d));
      const inc = await fsGet("income"); if(inc) setIncome(JSON.parse(inc));
      const rt = await fsGet("rate"); if(rt) setRate(parseFloat(rt)||3630);
      setLoading(false);
    })();
  },[user]);

  const handleLogin = async () => {
    setAuthError("");
    try { await signInWithPopup(auth, provider); }
    catch(e) { setAuthError("Error al iniciar sesión. Intenta de nuevo."); }
  };

  const handleLogout = async () => { await signOut(auth); setUser(null); };

  const saveAll = async(recs,defs,inc,rt)=>{
    setSaving(true);
    await Promise.all([
      fsSet("records", JSON.stringify(recs??records)),
      fsSet("defs", JSON.stringify(defs??expenseDefs)),
      fsSet("income", JSON.stringify(inc??income)),
      fsSet("rate", String(rt??rate)),
    ]);
    setSaving(false);
  };

  const downloadChart = (elId, filename="chart") => {
    const el = document.getElementById(elId);
    if(!el) return;
    import("html-to-image").then(({toPng})=>{
      toPng(el,{backgroundColor:"#ffffff",pixelRatio:2}).then(dataUrl=>{
        const a=document.createElement("a"); a.download=filename+".png"; a.href=dataUrl; a.click();
      });
    });
  };

  const allMonths = useMemo(()=>{
    const s=new Set([...records.map(r=>r.date?.slice(0,7)),...income.map(i=>i.date?.slice(0,7))].filter(Boolean));
    return [...s].sort().reverse();
  },[records,income]);

  const curMonth = filterMonth || allMonths[0] || new Date().toISOString().slice(0,7);
  const monthRecords = records.filter(r=>r.date?.startsWith(curMonth));
  const monthIncome = income.filter(i=>i.date?.startsWith(curMonth));
  const totalSpentCOP = monthRecords.reduce((a,r)=>a+(r.amountCOP||0),0);
  const littioIncome = monthIncome.filter(i=>i.account==="littio");
  const bancoIncome = monthIncome.filter(i=>i.account==="bancolombia");
  const littioUSD = littioIncome.reduce((a,i)=>a+(i.amountUSD||0),0);
  const littioCOP = littioIncome.reduce((a,i)=>a+(i.amountCOP||0),0);
  const bancoCOP = bancoIncome.reduce((a,i)=>a+(i.amountCOP||0),0);
  const totalIncomeCOP = littioCOP + bancoCOP;
  const balance = totalIncomeCOP - totalSpentCOP;
  const spentFromLittio = monthRecords.filter(r=>r.paymentMethod==="Littio (USD→COP)").reduce((a,r)=>a+(r.amountCOP||0),0);
  const spentFromBanco = monthRecords.filter(r=>r.paymentMethod==="Bancolombia (COP)").reduce((a,r)=>a+(r.amountCOP||0),0);

  const byCategory = useMemo(()=>{
    const m={};
    monthRecords.forEach(r=>{const c=r.category||"Sin categoría";m[c]=(m[c]||0)+(r.amountCOP||0);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[monthRecords]);

  const byPM = useMemo(()=>{
    const m={};
    monthRecords.forEach(r=>{const p=r.paymentMethod||"?";m[p]=(m[p]||0)+(r.amountCOP||0);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[monthRecords]);

  const last6months = useMemo(()=>{
    const ms=[...new Set(records.map(r=>r.date?.slice(0,7)))].filter(Boolean).sort().slice(-6);
    return ms.map(m=>({m,spent:records.filter(r=>r.date?.startsWith(m)).reduce((a,r)=>a+(r.amountCOP||0),0),inc:income.filter(i=>i.date?.startsWith(m)).reduce((a,i)=>a+(i.amountCOP||0),0)}));
  },[records,income]);

  const filtered = useMemo(()=>records.filter(r=>{
    if(filterMonth && !r.date?.startsWith(filterMonth)) return false;
    if(filterCat!=="all" && r.category!==filterCat) return false;
    if(filterPM!=="all" && r.paymentMethod!==filterPM) return false;
    if(search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[records,filterMonth,filterCat,filterPM,search]);

  const openAdd = ()=>{setForm({name:"",category:"",amountCOP:"",amountUSD:"",paymentMethod:"Littio (USD→COP)",date:new Date().toISOString().slice(0,10),paid:false,note:""});setModal("add");};
  const openEdit = r=>{setForm({...r});setModal("edit");};
  const openFromDef = def=>{setForm({name:def.name,category:def.category,amountCOP:"",amountUSD:"",paymentMethod:"Littio (USD→COP)",date:new Date().toISOString().slice(0,10),paid:false,note:""});setModal("add");};
  const openAddIncome = ()=>{setForm({account:"littio",amountUSD:"",amountCOP:"",date:new Date().toISOString().slice(0,10),note:""});setModal("income");};
  const openEditIncome = i=>{setForm({...i});setModal("editincome");};

  const saveRecord = async()=>{
    const amountCOP=form.amountCOP?parseFloat(form.amountCOP):(parseFloat(form.amountUSD)||0)*rate;
    const rec={...form,id:form.id||Date.now(),amountCOP:Math.round(amountCOP)};
    const upd=modal==="edit"?records.map(r=>r.id===rec.id?rec:r):[...records,rec];
    setRecords(upd); await saveAll(upd); setModal(null);
  };

  const delRecord = async id=>{
    const upd=records.filter(r=>r.id!==id); setRecords(upd); await saveAll(upd);
  };

  const saveIncome = async()=>{
    const isLittio=form.account==="littio";
    const amountUSD=isLittio?(parseFloat(form.amountUSD)||0):0;
    const amountCOP=isLittio?Math.round(amountUSD*rate):(parseFloat(form.amountCOP)||0);
    const rec={...form,id:form.id||Date.now(),amountUSD,amountCOP};
    const upd=(modal==="editincome")?income.map(i=>i.id===rec.id?rec:i):[...income,rec];
    setIncome(upd); await saveAll(undefined,undefined,upd); setModal(null);
  };

  const delIncome = async id=>{
    const upd=income.filter(i=>i.id!==id); setIncome(upd); await saveAll(undefined,undefined,upd);
  };

  const saveRate = async v=>{
    const n=parseFloat(v)||3630; setRate(n); await saveAll(undefined,undefined,undefined,n);
  };

  const addDef = async()=>{
    if(!form.name?.trim()) return;
    const upd=[...expenseDefs,{name:form.name.trim(),category:form.category||"Sin categoría"}];
    setExpenseDefs(upd); await saveAll(undefined,upd); setModal(null);
  };

  // ── Guards AFTER all hooks ──
  if(user === undefined) return <div style={{padding:"2rem",color:"#6b7280",fontFamily:"system-ui"}}>Cargando...</div>;
  if(user === null) return <LoginScreen onLogin={handleLogin} error={authError}/>;
  if(loading) return <div style={{padding:"2rem",color:"#6b7280",fontFamily:"system-ui"}}>Cargando datos...</div>;

  const s={
    card:{background:"white",border:"1px solid #e5e7eb",borderRadius:12,padding:"1rem"},
    metricCard:{background:"#f9fafb",borderRadius:8,padding:"0.875rem 1rem"},
    btn:{background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,color:"#111"},
    btnPrimary:{background:"#eff6ff",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:500,color:"#1d4ed8"},
    btnSuccess:{background:"#f0fdf4",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:500,color:"#15803d"},
    input:{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 10px",fontSize:14,marginTop:4,boxSizing:"border-box"},
    label:{fontSize:12,color:"#6b7280"},
  };

  const tabs=[{id:"dashboard",label:"Dashboard"},{id:"income",label:"Income"},{id:"expenses",label:"Expenses"},{id:"catalog",label:"Catalog"},{id:"charts",label:"Charts"}];

  return(
    <div style={{fontFamily:"system-ui, sans-serif",color:"#111",maxWidth:900,margin:"0 auto",padding:"0 1rem 2rem"}}>
      <div style={{display:"flex",gap:4,padding:"1rem 0 0.5rem",borderBottom:"1px solid #e5e7eb",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontWeight:600,fontSize:16,marginRight:8}}>💸 Expenses</span>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{...s.btn,background:tab===t.id?"#f3f4f6":"none",fontWeight:tab===t.id?500:400,border:tab===t.id?"1px solid #d1d5db":"1px solid transparent"}}>
            {t.label}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          {saving&&<span style={{fontSize:11,color:"#9ca3af"}}>Guardando...</span>}
          <span style={{fontSize:11,color:"#9ca3af"}}>{user.displayName?.split(" ")[0]}</span>
          <button onClick={handleLogout} style={{...s.btn,fontSize:11,padding:"4px 10px",color:"#6b7280"}}>Salir</button>
          <button onClick={openAddIncome} style={s.btnSuccess}>+ Income</button>
          <button onClick={openAdd} style={s.btnPrimary}>+ Expense</button>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"1rem",fontSize:12,color:"#6b7280"}}>
        <span>USD/COP:</span>
        <input type="number" value={rate} onChange={e=>saveRate(e.target.value)} style={{width:80,fontSize:12,padding:"2px 6px",border:"1px solid #e5e7eb",borderRadius:6}}/>
        <span style={{color:"#9ca3af"}}>Tasa de conversión Littio</span>
      </div>

      {tab==="dashboard"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:"0.75rem",alignItems:"center"}}>
            <label style={{fontSize:13,color:"#6b7280"}}>Mes:</label>
            <select value={curMonth} onChange={e=>setFilterMonth(e.target.value)} style={{fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px"}}>
              {allMonths.length===0&&<option value={curMonth}>{curMonth}</option>}
              {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{marginBottom:"0.4rem",fontSize:11,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:".05em"}}>Ingresos</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:"1.25rem"}}>
            <div style={{...s.metricCard,background:"#f0fdf4",borderLeft:"3px solid #16a34a"}}>
              <div style={{fontSize:11,color:"#15803d",marginBottom:4}}>Littio (USD)</div>
              <div style={{fontSize:20,fontWeight:500,color:"#15803d"}}>${fmtUSD(littioUSD)}</div>
              <div style={{fontSize:11,color:"#15803d",opacity:.8}}>≈ {fmt(littioCOP)} COP</div>
            </div>
            <div style={{...s.metricCard,background:"#eff6ff",borderLeft:"3px solid #2563eb"}}>
              <div style={{fontSize:11,color:"#1d4ed8",marginBottom:4}}>Bancolombia (COP)</div>
              <div style={{fontSize:20,fontWeight:500,color:"#1d4ed8"}}>{fmt(bancoCOP)}</div>
            </div>
            <div style={{...s.metricCard,borderLeft:"3px solid #6b7280"}}>
              <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Total ingresos</div>
              <div style={{fontSize:20,fontWeight:500}}>{fmt(totalIncomeCOP)} COP</div>
            </div>
          </div>
          <div style={{marginBottom:"0.4rem",fontSize:11,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:".05em"}}>Gastos y balance</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:"1.25rem"}}>
            {[
              {label:"Total gastos",value:fmt(totalSpentCOP)+" COP"},
              {label:"Desde Littio",value:fmt(spentFromLittio)+" COP"},
              {label:"Desde Bancolombia",value:fmt(spentFromBanco)+" COP"},
              {label:"Balance",value:fmt(balance)+" COP",color:balance>=0?"#15803d":"#dc2626"},
            ].map(c=>(
              <div key={c.label} style={{...s.metricCard,borderLeft:"3px solid "+(c.color||"#6b7280")}}>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>{c.label}</div>
                <div style={{fontSize:15,fontWeight:500,color:c.color||"#111"}}>{c.value}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
            <div style={s.card}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Por categoría</div>
              {byCategory.length===0?<div style={{fontSize:12,color:"#9ca3af"}}>Sin datos</div>:byCategory.slice(0,8).map(([cat,amt])=>(
                <div key={cat} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||"#888",flexShrink:0}}/>
                  <div style={{flex:1,fontSize:12,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat}</div>
                  <div style={{fontSize:12,fontWeight:500}}>{fmt(amt)}</div>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Por método de pago</div>
              {byPM.length===0?<div style={{fontSize:12,color:"#9ca3af"}}>Sin datos</div>:byPM.map(([pm,amt])=>(
                <div key={pm} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:2,background:PM_COLORS[pm]||"#888",flexShrink:0}}/>
                  <div style={{flex:1,fontSize:12,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pm}</div>
                  <div style={{fontSize:12,fontWeight:500}}>{fmt(amt)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={s.card}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Ingresos vs gastos — últimos 6 meses</div>
            {last6months.length===0?<div style={{fontSize:13,color:"#9ca3af"}}>Agrega datos para ver tendencias</div>:(()=>{
              const maxV=Math.max(...last6months.flatMap(x=>[x.spent,x.inc]),1);
              return(
                <div>
                  <div style={{display:"flex",gap:12,marginBottom:8,fontSize:11}}>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#16a34a",display:"inline-block"}}/> Ingresos</span>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#dc2626",display:"inline-block"}}/> Gastos</span>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    {last6months.map(({m,spent,inc})=>(
                      <div key={m} style={{flex:1,textAlign:"center"}}>
                        <div style={{display:"flex",gap:2,alignItems:"flex-end",justifyContent:"center",height:80}}>
                          <div style={{flex:1,background:"#16a34a",opacity:0.7,borderRadius:"2px 2px 0 0",height:Math.max(3,Math.round((inc/maxV)*80))}}/>
                          <div style={{flex:1,background:"#dc2626",opacity:0.7,borderRadius:"2px 2px 0 0",height:Math.max(3,Math.round((spent/maxV)*80))}}/>
                        </div>
                        <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>{m.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {tab==="income"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:"1rem"}}>
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px"}}>
              <option value="">Todos los meses</option>
              {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {["littio","bancolombia"].map(acc=>{
            const items=income.filter(i=>i.account===acc&&(!filterMonth||i.date?.startsWith(filterMonth)));
            return(
              <div key={acc} style={{marginBottom:"1.5rem"}}>
                <div style={{fontSize:13,fontWeight:500,color:acc==="littio"?"#15803d":"#1d4ed8",marginBottom:8}}>
                  {acc==="littio"?"Littio (USD salary)":"Bancolombia (COP)"}
                </div>
                {items.length===0?<div style={{fontSize:13,color:"#9ca3af"}}>Sin registros.</div>:
                  items.sort((a,b)=>b.date?.localeCompare(a.date||"")).map(i=>(
                    <div key={i.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:10,alignItems:"center",...s.card,marginBottom:6}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:500}}>{acc==="littio"?`$${fmtUSD(i.amountUSD)} USD`:`${fmt(i.amountCOP)} COP`}</div>
                        <div style={{fontSize:11,color:"#9ca3af"}}>{i.date}{acc==="littio"?` · ≈ ${fmt(i.amountCOP)} COP`:""}{i.note?` · ${i.note}`:""}</div>
                      </div>
                      <button onClick={()=>openEditIncome(i)} style={s.btn}>Editar</button>
                      <button onClick={()=>delIncome(i.id)} style={{...s.btn,color:"#dc2626",borderColor:"#fca5a5"}}>Eliminar</button>
                    </div>
                  ))
                }
              </div>
            );
          })}
        </div>
      )}

      {tab==="expenses"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
            <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{...s.input,width:130,marginTop:0}}/>
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px"}}>
              <option value="">Todos los meses</option>
              {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px"}}>
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterPM} onChange={e=>setFilterPM(e.target.value)} style={{fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px"}}>
              <option value="all">Todas las cuentas</option>
              {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {filtered.length===0?<div style={{color:"#9ca3af",fontSize:14}}>Sin registros.</div>:
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {filtered.sort((a,b)=>b.date?.localeCompare(a.date||"")||0).map(r=>(
                <div key={r.id} style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",gap:10,alignItems:"center",...s.card}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:CAT_COLORS[r.category]||"#888"}}/>
                  <div>
                    <div style={{fontSize:14,fontWeight:500}}>{r.name}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>{r.category} · {r.date} · {r.paymentMethod}</div>
                    {r.note&&<div style={{fontSize:11,color:"#d1d5db"}}>{r.note}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:14,fontWeight:500}}>{fmt(r.amountCOP)} COP</div>
                  </div>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:r.paid?"#f0fdf4":"#fefce8",color:r.paid?"#15803d":"#a16207",whiteSpace:"nowrap"}}>
                    {r.paid?"Pagado":"Pendiente"}
                  </span>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>openEdit(r)} style={s.btn}>Editar</button>
                    <button onClick={()=>delRecord(r.id)} style={{...s.btn,color:"#dc2626",borderColor:"#fca5a5"}}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {tab==="catalog"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
            <div style={{fontSize:13,color:"#6b7280"}}>{expenseDefs.length} items</div>
            <button onClick={()=>{setForm({name:"",category:"Sin categoría"});setModal("adddef");}} style={s.btn}>+ Nuevo</button>
          </div>
          {CATEGORIES.map(cat=>{
            const items=expenseDefs.filter(d=>d.category===cat);
            if(!items.length) return null;
            return(
              <div key={cat} style={{marginBottom:"1rem"}}>
                <div style={{fontSize:11,fontWeight:600,color:CAT_COLORS[cat]||"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>{cat}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {items.map((d,i)=>(
                    <button key={i} onClick={()=>openFromDef(d)} style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:99,padding:"5px 14px",cursor:"pointer",fontSize:13}}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="charts"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center"}}>
            <label style={{fontSize:13,color:"#6b7280"}}>Mes:</label>
            <select value={curMonth} onChange={e=>setFilterMonth(e.target.value)} style={{fontSize:13,border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 8px"}}>
              {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {["Littio (USD→COP)","Bancolombia (COP)","Visa","Sistecredito","Tuya"].map(pm=>{
            const pmRecords = monthRecords.filter(r=>r.paymentMethod===pm);
            if(!pmRecords.length) return null;
            const pmTotal = pmRecords.reduce((a,r)=>a+(r.amountCOP||0),0);
            const pmByCat = {};
            pmRecords.forEach(r=>{const c=r.category||"Sin categoría";pmByCat[c]=(pmByCat[c]||0)+(r.amountCOP||0);});
            const pmCats = Object.entries(pmByCat).sort((a,b)=>b[1]-a[1]);
            const chartId = `chart-${pm.replace(/[^a-z]/gi,"_")}`;
            return(
              <div key={pm} id={chartId} style={{...s.card,marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:14,fontWeight:600,color:PM_COLORS[pm]||"#111"}}>{pm}</div>
                  <button onClick={()=>downloadChart(chartId,`${pm}-${curMonth}`)} style={s.btn}>↓ PNG</button>
                </div>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>
                  {pmRecords.length} gastos · Total: <strong>{fmt(pmTotal)} COP</strong>
                  {pm==="Littio (USD→COP)"&&<span> · ≈ ${fmtUSD(pmTotal/rate)} USD</span>}
                </div>
                {pmCats.map(([cat,amt])=>{
                  const pct=Math.round((amt/pmTotal)*100);
                  return(
                    <div key={cat} style={{marginBottom:7}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
                        <span style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||"#888",display:"inline-block",flexShrink:0}}/>
                          <span style={{color:"#374151"}}>{cat}</span>
                        </span>
                        <span style={{fontWeight:500}}>{fmt(amt)} <span style={{color:"#9ca3af",fontWeight:400}}>({pct}%)</span></span>
                      </div>
                      <div style={{background:"#f3f4f6",borderRadius:3,height:7}}>
                        <div style={{background:PM_COLORS[pm]||CAT_COLORS[cat]||"#888",width:pct+"%",height:"100%",borderRadius:3,opacity:0.75}}/>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
                        {pmRecords.filter(r=>(r.category||"Sin categoría")===cat).map(r=>(
                          <span key={r.id} style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#f9fafb",border:"1px solid #e5e7eb",color:"#6b7280"}}>
                            {r.name} {fmt(r.amountCOP)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div id="chart-trend" style={{...s.card,marginBottom:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:500}}>Ingresos vs gastos — últimos 6 meses</div>
              <button onClick={()=>downloadChart("chart-trend","tendencia")} style={s.btn}>↓ PNG</button>
            </div>
            {last6months.length===0?<div style={{fontSize:13,color:"#9ca3af"}}>Sin datos.</div>:(()=>{
              const maxV=Math.max(...last6months.flatMap(x=>[x.spent,x.inc]),1);
              return(
                <div>
                  <div style={{display:"flex",gap:12,marginBottom:8,fontSize:11}}>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#16a34a",display:"inline-block"}}/> Ingresos</span>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#dc2626",display:"inline-block"}}/> Gastos</span>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    {last6months.map(({m,spent,inc})=>(
                      <div key={m} style={{flex:1,textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#9ca3af",marginBottom:3}}>{fmt(spent/1000)}k</div>
                        <div style={{display:"flex",gap:2,alignItems:"flex-end",justifyContent:"center",height:80}}>
                          <div style={{flex:1,background:"#16a34a",opacity:0.7,borderRadius:"2px 2px 0 0",height:Math.max(3,Math.round((inc/maxV)*80))}}/>
                          <div style={{flex:1,background:"#dc2626",opacity:0.7,borderRadius:"2px 2px 0 0",height:Math.max(3,Math.round((spent/maxV)*80))}}/>
                        </div>
                        <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>{m.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {(modal==="add"||modal==="edit")&&(
        <Modal title={modal==="edit"?"Editar gasto":"Registrar gasto"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label style={s.label}>Nombre</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={s.input}/></div>
            <div><label style={s.label}>Categoría</label>
              <select value={form.category||""} onChange={e=>setForm({...form,category:e.target.value})} style={s.input}>
                <option value="">Seleccionar...</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={s.label}>Método de pago</label>
              <select value={form.paymentMethod||""} onChange={e=>setForm({...form,paymentMethod:e.target.value})} style={s.input}>
                <option value="">Seleccionar...</option>
                {PAYMENT_METHODS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>{form.paymentMethod==="Littio (USD→COP)"?"Monto pagado (COP) — viene de Littio":"Monto (COP)"}</label>
              <input type="number" value={form.amountCOP||""} onChange={e=>setForm({...form,amountCOP:e.target.value})} style={s.input}/>
              {form.paymentMethod==="Littio (USD→COP)"&&form.amountCOP&&<div style={{fontSize:11,color:"#6b7280",marginTop:3}}>≈ ${fmtUSD(form.amountCOP/rate)} USD de Littio</div>}
            </div>
            <div><label style={s.label}>Fecha</label><input type="date" value={form.date||""} onChange={e=>setForm({...form,date:e.target.value})} style={s.input}/></div>
            <div><label style={s.label}>Nota (opcional)</label><input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} style={s.input}/></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="checkbox" id="paid" checked={!!form.paid} onChange={e=>setForm({...form,paid:e.target.checked})}/>
              <label htmlFor="paid" style={{fontSize:13}}>Marcar como pagado</label>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={saveRecord} style={{...s.btnPrimary,flex:1,padding:"8px"}}>Guardar</button>
              <button onClick={()=>setModal(null)} style={{...s.btn,padding:"8px 16px"}}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {(modal==="income"||modal==="editincome")&&(
        <Modal title={modal==="editincome"?"Editar ingreso":"Registrar ingreso"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label style={s.label}>Cuenta</label>
              <select value={form.account||"littio"} onChange={e=>setForm({...form,account:e.target.value,amountUSD:"",amountCOP:""})} style={s.input}>
                <option value="littio">Littio (USD salario)</option>
                <option value="bancolombia">Bancolombia (COP)</option>
              </select>
            </div>
            {form.account==="littio"?(
              <div>
                <label style={s.label}>Monto recibido (USD)</label>
                <input type="number" value={form.amountUSD||""} onChange={e=>setForm({...form,amountUSD:e.target.value,amountCOP:Math.round((parseFloat(e.target.value)||0)*rate)})} style={s.input}/>
                {form.amountUSD&&<div style={{fontSize:11,color:"#6b7280",marginTop:3}}>≈ {fmt((parseFloat(form.amountUSD)||0)*rate)} COP</div>}
              </div>
            ):(
              <div><label style={s.label}>Monto recibido (COP)</label><input type="number" value={form.amountCOP||""} onChange={e=>setForm({...form,amountCOP:e.target.value})} style={s.input}/></div>
            )}
            <div><label style={s.label}>Fecha</label><input type="date" value={form.date||""} onChange={e=>setForm({...form,date:e.target.value})} style={s.input}/></div>
            <div><label style={s.label}>Nota (opcional)</label><input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} style={s.input}/></div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={saveIncome} style={{...s.btnSuccess,flex:1,padding:"8px"}}>Guardar</button>
              <button onClick={()=>setModal(null)} style={{...s.btn,padding:"8px 16px"}}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {modal==="adddef"&&(
        <Modal title="Agregar al catálogo" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label style={s.label}>Nombre</label><input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} style={s.input}/></div>
            <div><label style={s.label}>Categoría</label>
              <select value={form.category||"Sin categoría"} onChange={e=>setForm({...form,category:e.target.value})} style={s.input}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={addDef} style={{...s.btnPrimary,flex:1,padding:"8px"}}>Agregar</button>
              <button onClick={()=>setModal(null)} style={{...s.btn,padding:"8px 16px"}}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}