// Server-collected date-scoped offers. Never turn a failed collection into an empty sale list.
export function connectPassSnapshot(lot,snapshot,asOf){
 if(!snapshot)return lot;
 const date=snapshot.query_date,at=Date.parse(snapshot.collected_at),now=Date.parse(asOf);
 const validDate=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date));
 if(!Array.isArray(snapshot.products)||snapshot.products.length>100||!['SUCCESS','ERROR'].includes(snapshot.last_result))throw Error('INVALID_PASS_SNAPSHOT');
 const products=[];const seen=new Set();
 if(validDate&&Number.isFinite(at)&&at<=now+30_000&&at>=now-7*86400_000){
  for(const p of snapshot.products){
   if(typeof p.id!=='string'||seen.has(p.id)||typeof p.name!=='string'||!Number.isInteger(p.price_won)||p.price_won<0||p.query_date!==date||typeof p.source_url!=='string'||!/^https:\/\/app\.modu\.kr\/t\/\d+\?/.test(p.source_url))throw Error('INVALID_PASS_PRODUCT');
   seen.add(p.id);const old=lot.products?.find(x=>x.id===p.id);
   const available=p.sale_status==='AVAILABLE'&&snapshot.last_result==='SUCCESS';
   products.push({...p,available,observed_date:date,available_dates:available?[date]:[],verified_at:snapshot.collected_at,conditions:old?.conditions??[],conditions_verified:Boolean(old?.conditions?.length)});
  }
 }
 return {...lot,observed_products:products,pass_collection:{...snapshot,products:undefined},pass_source_registered:true};
}
