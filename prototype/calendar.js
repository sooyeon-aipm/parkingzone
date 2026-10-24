export function koreaDate(date = new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function shiftMonth(month, delta) {
  const [year,number]=month.split('-').map(Number);
  const date=new Date(Date.UTC(year,number-1+delta,1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
}
export function selectableDate(value, today=koreaDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===value && value>=today;
}
export function monthDays(month, today) {
  const [year,number]=month.split('-').map(Number);
  const count=new Date(Date.UTC(year,number,0)).getUTCDate();
  return Array.from({length:count},(_,index)=>{
    const day=index+1, iso=`${month}-${String(day).padStart(2,'0')}`;
    return {day,iso,weekday:new Date(Date.UTC(year,number-1,day)).getUTCDay(),disabled:iso<today};
  });
}
