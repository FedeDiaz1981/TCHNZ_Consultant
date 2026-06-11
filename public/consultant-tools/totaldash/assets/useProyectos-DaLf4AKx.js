import{d as s,q as n,s as c}from"./index-CY_M_wcA.js";import{u}from"./useQuery-CHv1UAtH.js";import{a}from"./useCatalogos-AsUjiyN0.js";const y=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],h=s("chart-column",y);const l=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],f=s("circle-check",l);const m=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],k=s("target",m);const d=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],q=s("zap",d);function C(e={}){return u({queryKey:["proyectos",e],queryFn:async()=>{let o=c.from("proyectos").select(`
                    *,
                    clientes(nombre, pais, grupo_cliente),
                    consultores!pm_id(nombre_completo),
                    estatus_proyectos(nombre),
                    aplicaciones(nombre),
                    modulos(nombre)
                `);e.estatusIds&&e.estatusIds.length>0&&(o=o.in("estatus_id",e.estatusIds));const{data:t,error:r}=await o.order("created_at",{ascending:!1});if(r)throw console.error("Error fetching proyectos:",r),r;return t||[]},staleTime:120*1e3})}function g(){const e=n();return a({mutationFn:async o=>{const{data:t,error:r}=await c.from("proyectos").insert([o]).select(`
                    *,
                    clientes(nombre),
                    consultores!pm_id(nombre_completo),
                    estatus_proyectos(nombre),
                    aplicaciones(nombre),
                    modulos(nombre)
                `);if(r)throw r;return t[0]},onSuccess:()=>{e.invalidateQueries({queryKey:["proyectos"]})}})}function w(){const e=n();return a({mutationFn:async({id:o,updates:t})=>{const{data:r,error:i}=await c.from("proyectos").update(t).eq("id",o).select(`
                    *,
                    clientes(nombre),
                    consultores!pm_id(nombre_completo),
                    estatus_proyectos(nombre),
                    aplicaciones(nombre),
                    modulos(nombre)
                `);if(i)throw i;return r[0]},onSuccess:()=>{e.invalidateQueries({queryKey:["proyectos"]})}})}function v(){const e=n();return a({mutationFn:async o=>{const{error:t}=await c.from("proyectos").delete().eq("id",o);if(t)throw t;return o},onSuccess:()=>{e.invalidateQueries({queryKey:["proyectos"]})}})}export{f as C,k as T,q as Z,h as a,g as b,w as c,v as d,C as u};
