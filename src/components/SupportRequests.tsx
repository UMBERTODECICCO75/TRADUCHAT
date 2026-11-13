import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendSupportRequest, listSupportRequests } from "@/lib/account-requests.functions";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
export function SupportRequestForm() {
  const send = useServerFn(sendSupportRequest);
  const [category,setCategory]=useState<"privacy"|"assistance"|"copyright">("assistance");
  const [message,setMessage]=useState(""); const [status,setStatus]=useState(""); const [busy,setBusy]=useState(false);
  async function submit() { setBusy(true); try { await send({data:{category,message}});setMessage("");setStatus("Richiesta ricevuta."); } catch(err){setStatus(err instanceof Error?err.message:"Invio non riuscito.");} finally {setBusy(false);} }
  return <section className="mt-6 border-t border-border pt-6"><h2 className="font-display text-lg">Assistenza e privacy</h2><div className="mt-3 space-y-3"><Select value={category} onValueChange={v=>setCategory(v as typeof category)}><SelectTrigger aria-label="Tipo di richiesta"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="assistance">Assistenza</SelectItem><SelectItem value="privacy">Dati personali e privacy</SelectItem><SelectItem value="copyright">Diritti d'autore</SelectItem></SelectContent></Select><Textarea aria-label="Messaggio di assistenza" value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} /><Button variant="outline" disabled={busy || message.trim().length<5} onClick={()=>void submit()}>Invia richiesta</Button>{status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}</div></section>;
}
export function AdminSupportRequests() {
  const load=useServerFn(listSupportRequests); const [rows,setRows]=useState<Array<{id:string;user_id:string;category:string;message:string;status:string}>>([]);const [error,setError]=useState(""); const [more,setMore]=useState(false);
  async function refresh(offset=0,requestId?:string){try{const result=await load({data:{offset,requestId}});setRows(current=>offset===0?result.requests:[...current,...result.requests]);setMore(result.hasMore);setError("");}catch(err){setError(err instanceof Error?err.message:"Richieste non disponibili.");}}
  useEffect(()=>{void refresh();},[]);
  return <section className="mt-8 border-t border-border pt-6"><h2 className="font-display text-lg">Assistenza e privacy</h2>{rows.map(r=><div className="border-b border-border py-3 text-sm" key={r.id}><p className="break-all">{r.category} · {r.user_id}</p><p className="my-2 whitespace-pre-wrap break-words">{r.message}</p><Button variant="outline" size="sm" disabled={r.status==="reviewing"} onClick={()=>void refresh(0,r.id)}>{r.status==="reviewing"?"In verifica":"Prendi in carico"}</Button></div>)}{error && <p role="alert">{error}</p>}{!rows.length&&!error&&<p className="mt-3 text-sm text-muted-foreground">Nessuna richiesta aperta.</p>}{more&&<Button variant="outline" onClick={()=>void refresh(rows.length)}>Mostra altre</Button>}</section>;
}